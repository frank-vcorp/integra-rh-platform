import { router, publicProcedure, protectedProcedure, adminProcedure, hasPermission, requirePermission } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { storage as firebaseStorage } from "../firebase";
import { TRPCError } from "@trpc/server";
import { logAuditEvent } from "../_core/audit";

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
    .use(requirePermission("procesos", "view"))
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const process = await db.getProcessById(input.id);
      if (ctx.user.role === "client" && process?.clienteId !== ctx.user.clientId) {
        return null;
      }
      return process;
    }),

  getByCandidate: protectedProcedure
    .use(requirePermission("procesos", "view"))
    .input(z.object({ candidatoId: z.number() }))
    .query(async ({ input, ctx }) => {
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

      // Obtener consecutivo siguiente para el tipo/año
      const consecutivo = await db.getNextConsecutive(input.tipoProducto as any, year);

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

      return { ok: true } as const;
    }),

  updatePanelDetail: protectedProcedure
    .use(requirePermission("procesos", "edit"))
    .input(z.object({
      id: z.number(),
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
