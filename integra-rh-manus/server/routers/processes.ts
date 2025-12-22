import { router, publicProcedure, protectedProcedure, adminProcedure, hasPermission, requirePermission } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { storage as firebaseStorage } from "../firebase";
import { TRPCError } from "@trpc/server";
import { logAuditEvent } from "../_core/audit";
import { invokeLLM } from "../_core/llm";
import { ENV } from "../_core/env";

function assertCanEditProcess(ctx: any, proc: any) {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  // Clientes externos nunca deben modificar procesos
  if (ctx.user.role === "client") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Solo usuarios internos pueden modificar procesos.",
    });
  }

  // Superadmin siempre puede editar
  if (ctx.isSuperadmin) {
    return;
  }

  // Usuarios con capacidad de crear o eliminar procesos se consideran
  // administradores operativos y pueden editar cualquier proceso
  const canManageAll =
    hasPermission(ctx, "procesos", "create") ||
    hasPermission(ctx, "procesos", "delete");
  if (canManageAll) {
    return;
  }

  // Para el resto (por ejemplo Analistas), solo se permite editar
  // cuando son el analista asignado al proceso.
  const assignedId = (proc as any).especialistaAtraccionId as number | null | undefined;
  if (assignedId && assignedId === ctx.user.id) {
    return;
  }

  throw new TRPCError({
    code: "FORBIDDEN",
    message: "Solo el analista asignado o un administrador pueden modificar este proceso.",
  });
}

const CALIFICACION_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  recomendable: "Recomendable",
  con_reservas: "Recomendable con reservas",
  no_recomendable: "No recomendable",
};

const safeText = (value: unknown) => {
  if (value === null || value === undefined) return "-";
  const text = String(value).trim();
  return text.length > 0 ? text : "-";
};

export const processesRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    console.log("[processes.list] headers:", ctx.req.headers);

    // 1) Si hay usuario en contexto (admin o client) usarlo
    if (ctx.user?.role === "admin") {
      if (!hasPermission(ctx, "procesos", "view")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No puedes ver procesos" });
      }
      return db.getAllProcesses();
    }
    if (ctx.user?.role === "client" && ctx.user.clientId) {
      return db.getProcessesByClient(ctx.user.clientId);
    }

    // 2) Si no hay usuario, intentar autenticar con ClientToken directo
    const authHeader =
      ctx.req.headers["authorization"] ||
      (ctx.req.headers["Authorization" as any] as string | string[] | undefined);
    const header = Array.isArray(authHeader) ? authHeader[0] : authHeader;

    if (typeof header === "string" && header.startsWith("ClientToken ")) {
      const token = header.slice("ClientToken ".length).trim();
      const { validateClientToken } = await import("../auth/clientTokens");
      const client = await validateClientToken(token);
      if (client) {
        return db.getProcessesByClient(client.id);
      }
    }

    throw new TRPCError({ code: "UNAUTHORIZED", message: "Please login (10001)" });
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user?.role === "admin") {
        if (!hasPermission(ctx, "procesos", "view")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No puedes ver procesos" });
        }
      }

      const process = await db.getProcessById(input.id);
      if (ctx.user.role === "client" && process?.clienteId !== ctx.user.clientId) {
        return null;
      }
      return process;
    }),

  getByCandidate: protectedProcedure
    .input(z.object({ candidatoId: z.number() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user?.role === "admin") {
        if (!hasPermission(ctx, "procesos", "view")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No puedes ver procesos" });
        }
      }

      if (ctx.user.role === "client") {
        const candidate = await db.getCandidateById(input.candidatoId);
        if (candidate?.clienteId !== ctx.user.clientId) {
          return [];
        }
      }
      return db.getProcessesByCandidate(input.candidatoId);
    }),

  create: adminProcedure
    .use(requirePermission("procesos", "create"))
    .input(
      z.object({
        candidatoId: z.number(),
        clienteId: z.number(),
        puestoId: z.number(),
        clientSiteId: z.number().optional(),
        tipoProducto: z.string(),
        medioDeRecepcion: z.enum([
          'whatsapp','correo','telefono','boca_a_boca','portal','presencial','otro'
        ]).optional(),
        fechaRecepcion: z.date().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Determinar fecha y año
      const fechaRecepcion = input.fechaRecepcion ?? new Date();
      const year = fechaRecepcion.getFullYear();

      // Derivar prefijo para la clave (ej. ILA, ESE, VISITA, etc.)
      const derivePrefix = (tipo: string) => {
        const t = tipo.trim().toUpperCase();
        if (t.startsWith('ILA')) return 'ILA';
        if (t.startsWith('ESE')) return 'ESE';
        if (t.startsWith('VISITA')) return 'VISITA';
        if (t.startsWith('BURÓ')) return 'BURO';
        if (t.startsWith('INVESTIGACIÓN')) return 'INVEST';
        if (t.startsWith('SEMANAS')) return 'SEMANAS';
        return t.split(' ')[0].replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'PROC';
      };
      const prefix = derivePrefix(input.tipoProducto);

      // Obtener consecutivo siguiente por prefijo/año (evita colisiones ESE LOCAL vs ESE FORANEO)
      const consecutivo = await db.getNextConsecutiveByClavePrefix(prefix, year);
      const clave = `${prefix}-${year}-${String(consecutivo).padStart(3, '0')}`;

      const id = await db.createProcess({
        candidatoId: input.candidatoId,
        clienteId: input.clienteId,
        puestoId: input.puestoId,
        clientSiteId: input.clientSiteId,
        tipoProducto: input.tipoProducto as any,
        medioDeRecepcion: input.medioDeRecepcion as any,
        fechaRecepcion,
        consecutivo,
        clave,
      } as any);

      await logAuditEvent(ctx, {
        action: "create",
        entityType: "process",
        entityId: id,
        details: {
          candidatoId: input.candidatoId,
          clienteId: input.clienteId,
          puestoId: input.puestoId,
          tipoProducto: input.tipoProducto,
          clave,
        },
      });

      return { id, clave } as const;
  }),

  updateStatus: protectedProcedure
    .use(requirePermission("procesos", "edit"))
    .input(z.object({ id: z.number(), estatusProceso: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const proc = await db.getProcessById(input.id);
      if (!proc) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proceso no encontrado" });
      }
      assertCanEditProcess(ctx, proc);

      await db.updateProcess(input.id, { estatusProceso: input.estatusProceso } as any);

      await logAuditEvent(ctx, {
        action: "update",
        entityType: "process_status",
        entityId: input.id,
        details: { estatusProceso: input.estatusProceso },
      });

      return { ok: true } as const;
    }),

  updateCalificacion: protectedProcedure
    .use(requirePermission("procesos", "edit"))
    .input(z.object({ id: z.number(), calificacionFinal: z.enum(["pendiente","recomendable","con_reservas","no_recomendable"]) }))
    .mutation(async ({ input, ctx }) => {
      const proc = await db.getProcessById(input.id);
      if (!proc) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proceso no encontrado" });
      }
      assertCanEditProcess(ctx, proc);

      await db.updateProcess(input.id, { calificacionFinal: input.calificacionFinal } as any);

      await logAuditEvent(ctx, {
        action: "update",
        entityType: "process_score",
        entityId: input.id,
        details: { calificacionFinal: input.calificacionFinal },
      });

      // Intentar generar/actualizar el resumen IA para cliente en segundo plano
      void maybeGenerateProcessIaDictamen(input.id);

      return { ok: true } as const;
    }),

  updatePanelDetail: protectedProcedure
    .use(requirePermission("procesos", "edit"))
    .input(z.object({
      id: z.number(),
      tipoProducto: z.string().optional(),
      especialistaAtraccionId: z.number().nullable().optional(),
      especialistaAtraccionNombre: z.string().trim().nullable().optional(),
      estatusVisual: z.enum(["nuevo","en_proceso","pausado","cerrado","descartado"]),
      fechaCierre: z.string().nullable().optional(),
      investigacionLaboral: z.object({
        resultado: z.string().trim().optional(),
        detalles: z.string().trim().optional(),
        completado: z.boolean().optional(),
      }).partial().optional(),
      investigacionLegal: z.object({
        antecedentes: z.string().trim().optional(),
        flagRiesgo: z.boolean().optional(),
        archivoAdjuntoUrl: z.string().trim().optional(),
        notasPeriodisticas: z.string().trim().optional(),
        observacionesImss: z.string().trim().optional(),
        semanasComentario: z.string().trim().optional(),
      }).partial().optional(),
      buroCredito: z.object({
        estatus: z.string().trim().optional(),
        score: z.string().trim().optional(),
        aprobado: z.boolean().optional(),
      }).partial().optional(),
      visitaDetalle: z.object({
        tipo: z.enum(["virtual","presencial"]).optional(),
        comentarios: z.string().trim().optional(),
        fechaRealizacion: z.string().optional(),
        enlaceReporteUrl: z.string().trim().optional(),
      }).partial().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const proc = await db.getProcessById(input.id);
      if (!proc) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proceso no encontrado" });
      }
      assertCanEditProcess(ctx, proc);

      const payload: any = {
        tipoProducto: input.tipoProducto as any ?? proc.tipoProducto,
        especialistaAtraccionId: input.especialistaAtraccionId ?? null,
        especialistaAtraccionNombre: input.especialistaAtraccionNombre ?? null,
        estatusVisual: input.estatusVisual,
        fechaCierre: input.fechaCierre ? new Date(input.fechaCierre) : null,
        investigacionLaboral: input.investigacionLaboral,
        investigacionLegal: input.investigacionLegal,
        buroCredito: input.buroCredito,
        visitaDetalle: input.visitaDetalle,
      };
      await db.updateProcess(input.id, payload);
      return { ok: true } as const;
    }),

  generarDictamen: protectedProcedure
    .use(requirePermission("procesos", "edit"))
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const proc = await db.getProcessById(input.id);
      if (!proc) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proceso no encontrado" });
      }
      assertCanEditProcess(ctx, proc);
      if (!proc.calificacionFinal || proc.calificacionFinal === 'pendiente') {
        throw new Error("Define la calificación final antes de generar el dictamen");
      }

      // Usar bucket por defecto configurado en admin.initializeApp para evitar errores de nombre
      const bucket = firebaseStorage.bucket();
      const key = `processes/${proc.id}/dictamen-${proc.calificacionFinal}-${Date.now()}.txt`;

      const contenido = `Dictamen del Proceso\n\nClave: ${proc.clave}\nProceso: ${proc.tipoProducto}\nCalificación final: ${proc.calificacionFinal}\nFecha: ${new Date().toISOString()}\nGenerado por: ${ctx.user.email || ctx.user.name || 'Admin'}\n`;
      const file = bucket.file(key);
      await file.save(Buffer.from(contenido, 'utf8'), { contentType: 'text/plain', resumable: false });
      const [signedUrl] = await file.getSignedUrl({ action: 'read', expires: new Date(Date.now() + 365*24*60*60*1000) });

      // guardar documento
      await db.createDocument({
        procesoId: proc.id,
        tipoDocumento: 'DICTAMEN',
        nombreArchivo: `dictamen-${proc.clave}.txt`,
        url: signedUrl,
        fileKey: key as any,
        mimeType: 'text/plain',
        uploadedBy: ctx.user.email || ctx.user.name || 'Admin',
      } as any);

      // actualizar proceso con enlaces
      await db.updateProcess(proc.id, { archivoDictamenUrl: signedUrl as any, archivoDictamenPath: key as any } as any);
      // Generar/actualizar resumen IA para el cliente en segundo plano
      void maybeGenerateProcessIaDictamen(proc.id);

      return { url: signedUrl, path: key } as const;
    }),

  // ==========================
  // VISITAS DOMICILIARIAS
  // ==========================
  listVisits: protectedProcedure
    .use(requirePermission("visitas", "view"))
    .query(async ({ ctx }) => {
      const all = await db.getAllProcesses();
      const filtered = ctx.user.role === 'client'
        ? all.filter((p: any) => p.clienteId === (ctx.user as any).clientId)
        : all;
      return filtered
        .filter((p: any) => p.visitStatus && (p.visitStatus.status || p.visitStatus.scheduledDateTime))
        .map((p: any) => ({
          id: p.id,
          clave: p.clave,
          tipoProducto: p.tipoProducto,
          clienteId: p.clienteId,
          candidatoId: p.candidatoId,
          visitStatus: p.visitStatus || {},
        }));
    }),

  visitAssign: protectedProcedure
    .use(requirePermission("visitas", "edit"))
    .input(z.object({ id: z.number(), encuestadorId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const proc = await db.getProcessById(input.id);
      if (!proc) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proceso no encontrado" });
      }
      assertCanEditProcess(ctx, proc);
      const prev = (proc as any).visitStatus || {};
      await db.updateProcess(input.id, { visitStatus: { ...prev, status: prev.scheduledDateTime ? 'programada' : 'asignada', encuestadorId: input.encuestadorId } } as any);
      return { ok: true } as const;
    }),

  visitSchedule: protectedProcedure
    .use(requirePermission("visitas", "edit"))
    .input(z.object({ id: z.number(), fechaHora: z.string(), direccion: z.string().optional(), observaciones: z.string().optional(), encuestadorId: z.number().optional() }))
    .mutation(async ({ input, ctx }) => {
      const proc = await db.getProcessById(input.id);
      if (!proc) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proceso no encontrado" });
      }
      assertCanEditProcess(ctx, proc);
      const prev = (proc as any).visitStatus || {};
      await db.updateProcess(input.id, { visitStatus: { ...prev, status: 'programada', scheduledDateTime: input.fechaHora, direccion: input.direccion, observaciones: input.observaciones, encuestadorId: input.encuestadorId ?? prev.encuestadorId } } as any);
      return { ok: true } as const;
    }),

  visitUpdate: protectedProcedure
    .use(requirePermission("visitas", "edit"))
    .input(z.object({ id: z.number(), fechaHora: z.string().optional(), direccion: z.string().optional(), observaciones: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const proc = await db.getProcessById(input.id);
      if (!proc) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proceso no encontrado" });
      }
      assertCanEditProcess(ctx, proc);
      const prev = (proc as any).visitStatus || {};
      await db.updateProcess(input.id, { visitStatus: { ...prev, scheduledDateTime: input.fechaHora ?? prev.scheduledDateTime, direccion: input.direccion ?? prev.direccion, observaciones: input.observaciones ?? prev.observaciones } } as any);
      return { ok: true } as const;
    }),

  visitMarkDone: protectedProcedure
    .use(requirePermission("visitas", "edit"))
    .input(z.object({ id: z.number(), observaciones: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const proc = await db.getProcessById(input.id);
      if (!proc) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proceso no encontrado" });
      }
      assertCanEditProcess(ctx, proc);
      const prev = (proc as any).visitStatus || {};
      await db.updateProcess(input.id, { visitStatus: { ...prev, status: 'realizada', observaciones: input.observaciones ?? prev.observaciones } } as any);
      return { ok: true } as const;
    }),

  visitCancel: protectedProcedure
    .use(requirePermission("visitas", "edit"))
    .input(z.object({ id: z.number(), motivo: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const proc = await db.getProcessById(input.id);
      if (!proc) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proceso no encontrado" });
      }
      assertCanEditProcess(ctx, proc);
      const prev = (proc as any).visitStatus || {};
      await db.updateProcess(input.id, { visitStatus: { ...prev, status: 'no_asignada', scheduledDateTime: undefined, observaciones: input.motivo ?? prev.observaciones } } as any);
      return { ok: true } as const;
    }),

  // ==========================
  // ELIMINAR PROCESO
  // ==========================
  delete: adminProcedure
    .use(requirePermission("procesos", "delete"))
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      await db.deleteProcess(input.id);
      return { ok: true } as const;
    }),
});

async function maybeGenerateProcessIaDictamen(procesoId: number) {
  try {
    if (!ENV.forgeApiKey) {
      // IA no configurada; salir silenciosamente
      return;
    }

    const proc = await db.getProcessById(procesoId);
    if (!proc) return;

    // Solo generar cuando exista calificación final distinta de pendiente
    if (!proc.calificacionFinal || proc.calificacionFinal === "pendiente") {
      return;
    }

    // Respetar la preferencia de IA a nivel cliente
    const client = proc.clienteId ? await db.getClientById(proc.clienteId) : undefined;
    if (!client?.iaSuggestionsEnabled) {
      return;
    }

    const candidate = proc.candidatoId
      ? await db.getCandidateById(proc.candidatoId)
      : undefined;

    const trabajos = proc.candidatoId
      ? await db.getWorkHistoryByCandidate(proc.candidatoId)
      : [];

    const trabajosTexto =
      trabajos.length === 0
        ? "Sin historial laboral registrado en el sistema."
        : trabajos
            .map((w: any, idx: number) => {
              const ia = (w.investigacionDetalle as any)?.iaDictamen || {};
              const lineaBase =
                `Empleo ${idx + 1}: ${safeText(w.puesto)} en ${safeText(
                  w.empresa
                )} (${safeText(w.fechaInicio)} – ${safeText(w.fechaFin || "Actual")}). ` +
                `Dictamen humano: ${safeText(
                  CALIFICACION_LABELS[w.resultadoVerificacion as string] ||
                    w.resultadoVerificacion
                )}.`;
              const lineaIa = ia.resumenCorto
                ? ` Resumen IA: ${String(ia.resumenCorto)}`
                : "";
              return lineaBase + lineaIa;
            })
            .join("\n");

    const invLab: any = (proc as any).investigacionLaboral || {};
    const invLegal: any = (proc as any).investigacionLegal || {};
    const buro: any = (proc as any).buroCredito || {};
    const visita: any = (proc as any).visitaDetalle || (proc as any).visitStatus || {};

    const systemPrompt =
      "Eres un redactor experto en informes ejecutivos para clientes corporativos en México. " +
      "Recibes la información de un proceso de investigación de un candidato (laboral, legal, buró, visita, etc.) " +
      "y debes generar un resumen claro, profesional y fácil de entender para un gerente de recursos humanos.\n\n" +
      "Muy importante:\n" +
      "- El dictamen HUMANO (calificación final) ya está definido y NO debes cambiarlo ni contradecirlo.\n" +
      "- Tus textos deben reforzar y explicar la decisión humana, nunca suavizar un 'no recomendable' ni elevar un 'con reservas' a 'recomendable'.\n" +
      "- El texto que generes será visible para el cliente, así que evita términos técnicos excesivos.\n" +
      "- Devuelve SIEMPRE un JSON válido con las claves: resumenEjecutivoCliente, recomendacionesCliente, notaInternaAnalista, dictamenFinal.";

    const userPrompt =
      `Información del proceso:\n` +
      `- Clave del proceso: ${safeText(proc.clave)}\n` +
      `- Tipo de proceso: ${safeText(proc.tipoProducto)}\n` +
      `- Cliente: ${safeText(client?.nombreEmpresa)}\n` +
      `- Candidato: ${safeText(candidate?.nombreCompleto)}\n` +
      `- Puesto: ${safeText((candidate as any)?.puestoNombre || "")}\n` +
      `- Fecha de recepción: ${safeText(proc.fechaRecepcion)}\n` +
      `- Fecha de cierre: ${safeText(proc.fechaCierre)}\n` +
      `- Calificación final (humana): ${safeText(
        CALIFICACION_LABELS[proc.calificacionFinal as string] ||
          proc.calificacionFinal
      )}\n\n` +
      `Bloques del proceso:\n` +
      `1) Investigación laboral:\n` +
      `   - Resultado: ${safeText(invLab.resultado)}\n` +
      `   - Detalles: ${safeText(invLab.detalles)}\n` +
      `   - Completado: ${invLab.completado ? "Sí" : "No"}\n\n` +
      `2) Investigación legal:\n` +
      `   - Antecedentes: ${safeText(invLegal.antecedentes)}\n` +
      `   - Indicador de riesgo: ${
        invLegal.flagRiesgo === true
          ? "Con riesgo"
          : invLegal.flagRiesgo === false
          ? "Sin riesgo relevante"
          : "No especificado"
      }\n\n` +
      `3) Buró de crédito:\n` +
      `   - Estatus: ${safeText(buro.estatus)}\n` +
      `   - Score: ${safeText(buro.score)}\n` +
      `   - Aprobado: ${
        buro.aprobado === true
          ? "Aprobado"
          : buro.aprobado === false
          ? "Rechazado"
          : "No especificado"
      }\n\n` +
      `4) Visita domiciliaria/virtual:\n` +
      `   - Tipo: ${safeText(visita.tipo || visita.status)}\n` +
      `   - Comentarios: ${safeText(visita.comentarios || visita.observaciones)}\n` +
      `   - Fecha realización / programada: ${safeText(
        visita.fechaRealizacion || visita.scheduledDateTime
      )}\n\n` +
      `Historial laboral considerado (incluye resúmenes IA por empleo cuando existen):\n` +
      `${trabajosTexto}\n\n` +
      `Instrucciones de salida:\n` +
      `- resumenEjecutivoCliente: 1–3 párrafos cortos que expliquen de forma equilibrada el perfil del candidato, apoyando el dictamen humano.\n` +
      `- recomendacionesCliente: arreglo de frases cortas con sugerencias prácticas (por ejemplo: tipo de seguimiento, periodo de prueba, áreas a supervisar).\n` +
      `- notaInternaAnalista: comentario breve SOLO para el analista (no para el cliente), aclarando cómo usar este resumen IA.\n` +
      `- dictamenFinal: copia EXACTA del valor de calificación final: "${proc.calificacionFinal}".\n\n` +
      `Responde ÚNICAMENTE con un objeto JSON con esta estructura:\n` +
      `{\n` +
      `  "resumenEjecutivoCliente": "string",\n` +
      `  "recomendacionesCliente": ["string"],\n` +
      `  "notaInternaAnalista": "string",\n` +
      `  "dictamenFinal": "${proc.calificacionFinal}"\n` +
      `}`;

    const result = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1024,
    });

    const firstChoice = result.choices?.[0];
    if (!firstChoice) return;

    const rawContent = firstChoice.message.content as any;
    let jsonText: string | undefined;

    if (typeof rawContent === "string") {
      jsonText = rawContent;
    } else if (Array.isArray(rawContent)) {
      const textPart = rawContent.find((p: any) => p.type === "text");
      jsonText = textPart?.text;
    }

    if (!jsonText) return;

    let parsed: any;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      return;
    }

    const iaDictamenCliente = {
      resumenEjecutivoCliente:
        typeof parsed.resumenEjecutivoCliente === "string"
          ? parsed.resumenEjecutivoCliente
          : "",
      recomendacionesCliente: Array.isArray(parsed.recomendacionesCliente)
        ? parsed.recomendacionesCliente.map((x: any) => String(x)).filter(Boolean)
        : [],
      notaInternaAnalista:
        typeof parsed.notaInternaAnalista === "string"
          ? parsed.notaInternaAnalista
          : "",
      dictamenFinal: proc.calificacionFinal,
      generatedAt: new Date().toISOString(),
    };

    const mergedInvestigacionLaboral = {
      ...(invLab || {}),
      iaDictamenCliente,
    };

    await db.updateProcess(proc.id, {
      investigacionLaboral: mergedInvestigacionLaboral as any,
    } as any);
  } catch (error) {
    console.error(
      "[IA] Error generando dictamen IA para proceso",
      procesoId,
      error
    );
  }
}
