import { router, protectedProcedure, requirePermission, hasPermission } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { normalizeWorkDateInput } from "../_core/workDate";
import * as db from "../db";
import { invokeLLM } from "../_core/llm";
import { ENV } from "../_core/env";
import { logger } from "../_core/logger";

const ESTATUS_INVESTIGACION = ["en_revision", "revisado", "terminado"] as const;

const CAUSALES_SALIDA = [
  "RENUNCIA VOLUNTARIA",
  "VIGENTE",
  "RECORTE DE PERSONAL",
  "TÉRMINO DE CONTRATO",
  "TERMINACIÓN DE PROYECTO",
  "TÉRMINO DE PERIODO DE PRUEBA",
  "REESTRUCTURACIÓN",
  "CAMBIO DE ADMINISTRACIÓN",
  "CIERRE DE EMPRESA",
  "POR ANTIGÜEDAD NO HAY INFORMACIÓN EN SISTEMA",
  "POR POLÍTICAS DE PRIVACIDAD NO DAN REFERENCIAS LABORALES",
  "BAJO DESEMPEÑO",
  "AUSENTISMO",
  "ABANDONO DE EMPLEO",
  "ACUMULACIÓN DE FALTAS INJUSTIFICADAS",
  "INCUMPLIMIENTO DE POLÍTICAS INTERNAS",
  "NO APEGO A POLÍTICAS Y PROCESOS",
  "CONDUCTA INADECUADA",
  "CONFLICTIVO",
  "VIOLACIÓN AL CODIGO DE CONDUCTA Y ÉTICA (DESHONESTIDAD)",
  "FALTA DE PROBIDAD",
  "PERDIDA DE CONFIANZA",
  "NO RENOVACIÓN DE CONTRATO",
  "BAJA CON CAUSAL",
  "BAJA ADMINISTRATIVA",
  "ABUSO DE CONFIANZA",
  "FALSIFICACIÓN DE DOCUMENTOS",
  "SUSTRACCIÓN DE COMBUSTIBLE",
  "ALCOHOLISMO",
  "PERDIDA DE RECURSOS / MATERIAL DE LA EMPRESA",
  "DAÑO A UNIDAD VEHICULAR",
] as const;

const RATING_VALUES = {
  EXCELENTE: 4,
  BUENO: 3,
  REGULAR: 2,
  MALO: 1,
} as const;

const ratingSchema = z.enum(["EXCELENTE", "BUENO", "REGULAR", "MALO"]);

const IA_MINI_DICTAMEN_SYSTEM_PROMPT =
  "Eres un analista senior de Recursos Humanos especializado en investigaciones laborales telefónicas en México. " +
  "Tu tarea es ayudar al analista humano a resumir un solo empleo de la historia laboral de un candidato. " +
  "No decides si se contrata o no al candidato; tampoco modificas el resultado de verificación humano. " +
  "Solo generas un mini-dictamen interno, claro y breve, que sirva como apoyo.\n\n" +
  "Siempre responde ÚNICAMENTE con un objeto JSON válido con las claves: " +
  "resumenCorto, fortalezas, riesgos, sugerenciasSeguimiento, recomendacionTexto, soloUsoInterno.";

const resultadoLabels: Record<string, string> = {
  pendiente: "Pendiente",
  recomendable: "Recomendable",
  con_reservas: "Recomendable con reservas",
  no_recomendable: "No recomendable",
};

const safe = (value: unknown) => {
  if (value === null || value === undefined) return "-";
  const text = String(value).trim();
  return text.length > 0 ? text : "-";
};

async function maybeGenerateIaDictamen(params: {
  id: number;
  detailsHint?: any;
  scoreHint?: number | null;
}) {
  if (!ENV.forgeApiKey) {
    // IA no configurada; salir en silencio.
    return;
  }

  try {
    const work = await db.getWorkHistoryById(params.id);
    if (!work) return;

    // Solo generar cuando la investigación esté terminada y exista un resultado humano.
    if (work.estatusInvestigacion !== "terminado") return;
    if (!work.resultadoVerificacion || work.resultadoVerificacion === "pendiente") return;

    const candidate = await db.getCandidateById(work.candidatoId);

    // Tomar el detalle más reciente desde BD; si no existe, usar el hint recibido.
    const details: any = (work.investigacionDetalle as any) ?? params.detailsHint ?? {};
    const score: number | null =
      typeof work.desempenoScore === "number" ? work.desempenoScore : params.scoreHint ?? null;

    const empresa = details.empresa || {};
    const puesto = details.puesto || {};
    const periodo = details.periodo || {};
    const incidencias = details.incidencias || {};
    const desempeno = details.desempeno || {};
    const conclusion = details.conclusion || {};

    const periodosTexto =
      Array.isArray(periodo.periodos) && periodo.periodos.length > 0
        ? periodo.periodos
            .map(
              (p: any, idx: number) =>
                `Periodo ${idx + 1}: empresa=${safe(p.periodoEmpresa)} / candidato=${safe(
                  p.periodoCandidato
                )}`
            )
            .join("\n")
        : "-";

    /** ARCH-20260128-20 | Doc: context/SPEC-INVESTIGACION-INCIDENCIAS-DUAL.md */
    const prompt =
      `Genera un mini-dictamen interno para el siguiente empleo investigado de la historia laboral de un candidato.\n\n` +
      `Contexto del empleo:\n` +
      `- Candidato: ${safe(candidate?.nombreCompleto)}\n` +
      `- Empresa investigada: ${safe(work.empresa)}\n` +
      `- Puesto principal: ${safe(
        puesto.puestoFinal || puesto.puestoInicial || work.puesto
      )}\n\n` +
      `Periodo y sueldos:\n` +
      `- Fecha inicio (registro principal): ${safe(work.fechaInicio)}\n` +
      `- Fecha fin (registro principal): ${safe(work.fechaFin)}\n` +
      `- Tiempo trabajado según candidato (texto): ${safe(
        periodo.antiguedadTexto || work.tiempoTrabajado
      )}\n` +
      `- Tiempo trabajado según empresa: ${safe(work.tiempoTrabajadoEmpresa)}\n` +
      `- Periodos declarados:\n${periodosTexto}\n` +
      `- Sueldo inicial: ${safe(periodo.sueldoInicial)}\n` +
      `- Sueldo final: ${safe(periodo.sueldoFinal)}\n\n` +
      `Motivos de separación e incidencias:\n` +
      `- Motivo de separación (candidato): ${safe(
        incidencias.motivoSeparacionCandidato || work.causalSalidaRH
      )}\n` +
      `- Motivo de separación (empresa): ${safe(
        incidencias.motivoSeparacionEmpresa || work.causalSalidaJefeInmediato
      )}\n` +
      `- Incapacidades declaradas por el candidato: ${safe(incidencias.incapacidadesCandidato)}\n` +
      `- Incapacidades reportadas por la empresa: ${safe(
        incidencias.incapacidadesEmpresa || incidencias.incapacidadesJefe
      )}\n` +
      `- Inasistencias / faltas (candidato): ${safe(
        incidencias.inasistenciasCandidato || incidencias.inasistencias
      )}\n` +
      `- Inasistencias / faltas (empresa): ${safe(incidencias.inasistenciasEmpresa)}\n` +
      `- Antecedentes legales (candidato): ${safe(
        incidencias.antecedentesLegalesCandidato || incidencias.antecedentesLegales
      )}\n` +
      `- Antecedentes legales (empresa): ${safe(incidencias.antecedentesLegalesEmpresa)}\n\n` +
      `Matriz de desempeño (EXCELENTE/BUENO/REGULAR/MALO):\n` +
      `- Evaluación general: ${safe(desempeno.evaluacionGeneral)}\n` +
      `- Puntualidad: ${safe(desempeno.puntualidad)}\n` +
      `- Colaboración: ${safe(desempeno.colaboracion)}\n` +
      `- Responsabilidad: ${safe(desempeno.responsabilidad)}\n` +
      `- Actitud ante la autoridad: ${safe(desempeno.actitudAutoridad)}\n` +
      `- Actitud ante subordinados: ${safe(desempeno.actitudSubordinados)}\n` +
      `- Honradez / Integridad: ${safe(desempeno.honradezIntegridad)}\n` +
      `- Calidad de trabajo: ${safe(desempeno.calidadTrabajo)}\n` +
      `- Liderazgo: ${safe(desempeno.liderazgo)}\n` +
      `- Conflictividad: ${safe(desempeno.conflictividad)}\n` +
      (desempeno.conflictividadComentario
        ? `- Comentario de conflictividad: ${safe(desempeno.conflictividadComentario)}\n`
        : "") +
      `\n` +
      `Resultado de verificación HUMANO:\n` +
      `- resultadoVerificacion: ${safe(work.resultadoVerificacion)} (${safe(
        resultadoLabels[work.resultadoVerificacion as string] || ""
      )})\n` +
      `- Puntaje numérico de desempeño (desempenoScore 0–100): ${
        typeof score === "number" ? score : "sin puntaje calculado"
      }\n\n` +
      `Conclusiones de la entrevista telefónica:\n` +
      `- ¿Es recomendable?: ${safe(conclusion.esRecomendable)}\n` +
      `- ¿Lo recontrataría?: ${safe(conclusion.loRecontrataria)}\n` +
      `- Razón/condiciones de recontratación: ${safe(conclusion.razonRecontratacion)}\n` +
      `- Informante: ${safe(conclusion.informanteNombre)} (${safe(
        conclusion.informanteCargo
      )})\n` +
      `- Teléfono informante: ${safe(conclusion.informanteTelefono)}\n` +
      `- Email informante: ${safe(conclusion.informanteEmail)}\n` +
      `- Comentarios adicionales del informante: ${safe(conclusion.comentariosAdicionales)}\n\n` +
      `Notas internas del analista:\n` +
      `- Comentario de investigación: ${safe(work.comentarioInvestigacion)}\n` +
      `- Observaciones generales: ${safe(work.observaciones)}\n\n` +
      `Instrucciones para tu respuesta:\n` +
      `1. resumenCorto: una frase de 2–3 líneas máximo que resuma desempeño y riesgos principales en este empleo.\n` +
      `2. fortalezas: arreglo de viñetas cortas (máx. 5) con puntos positivos observados.\n` +
      `3. riesgos: arreglo de viñetas cortas (máx. 5) con riesgos o alertas relevantes.\n` +
      `4. sugerenciasSeguimiento: arreglo de viñetas con recomendaciones prácticas para el analista/cliente si decide contratar.\n` +
      `5. recomendacionTexto: párrafo breve que sintetice el empleo, siempre alineado con resultadoVerificacion y sin contradecir el dictamen humano.\n` +
      `6. soloUsoInterno: siempre true.\n\n` +
      `Responde SOLO con un JSON válido, sin comentarios ni texto adicional, con esta estructura exacta:\n` +
      `{\n` +
      `  "resumenCorto": "string",\n` +
      `  "fortalezas": ["string"],\n` +
      `  "riesgos": ["string"],\n` +
      `  "sugerenciasSeguimiento": ["string"],\n` +
      `  "recomendacionTexto": "string",\n` +
      `  "soloUsoInterno": true\n` +
      `}`;

    const result = await invokeLLM({
      messages: [
        { role: "system", content: IA_MINI_DICTAMEN_SYSTEM_PROMPT },
        { role: "user", content: prompt },
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

    const iaDictamen = {
      resumenCorto: typeof parsed.resumenCorto === "string" ? parsed.resumenCorto : "",
      fortalezas: Array.isArray(parsed.fortalezas)
        ? parsed.fortalezas.map((x: any) => String(x)).filter(Boolean)
        : [],
      riesgos: Array.isArray(parsed.riesgos)
        ? parsed.riesgos.map((x: any) => String(x)).filter(Boolean)
        : [],
      sugerenciasSeguimiento: Array.isArray(parsed.sugerenciasSeguimiento)
        ? parsed.sugerenciasSeguimiento.map((x: any) => String(x)).filter(Boolean)
        : [],
      recomendacionTexto:
        typeof parsed.recomendacionTexto === "string" ? parsed.recomendacionTexto : "",
      soloUsoInterno:
        typeof parsed.soloUsoInterno === "boolean" ? parsed.soloUsoInterno : true,
      generatedAt: new Date().toISOString(),
    };

    const mergedDetails = {
      ...details,
      iaDictamen,
    };

    await db.updateWorkHistory(params.id, {
      investigacionDetalle: mergedDetails as any,
      desempenoScore: typeof score === "number" ? score : undefined,
    } as any);
  } catch (error) {
    try {
      logger.error("[IA] Error generando mini-dictamen IA para workHistory", {
        workHistoryId: params.id,
        error: error instanceof Error ? error.message : String(error),
      });
    } catch {
      // no-op
    }
  }
}

export const workHistoryRouter = router({
  getByCandidate: protectedProcedure
    .input(z.object({ candidatoId: z.number() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role === "client") {
        const candidate = await db.getCandidateById(input.candidatoId);
        if (candidate?.clienteId !== ctx.user.clientId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        return db.getWorkHistoryByCandidate(input.candidatoId);
      }

      // Usuarios internos: validar permiso de lectura sobre candidatos
      if (!hasPermission(ctx as any, "candidatos", "view")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return db.getWorkHistoryByCandidate(input.candidatoId);
    }),

  create: protectedProcedure
    .use(requirePermission("candidatos", "edit"))
    .input(
      z.object({
        candidatoId: z.number(),
        empresa: z.string().min(1),
        puesto: z.string().optional(),
        fechaInicio: z
          .string()
          .regex(/^\d{4}(-\d{2})?(-\d{2})?$/)
          .optional(),
        fechaFin: z
          .string()
          .regex(/^\d{4}(-\d{2})?(-\d{2})?$/)
          .optional(),
        tiempoTrabajado: z.string().optional(),
        tiempoTrabajadoEmpresa: z.string().optional(),
        causalSalidaRH: z.enum(CAUSALES_SALIDA).optional(),
        causalSalidaJefeInmediato: z.enum(CAUSALES_SALIDA).optional(),
        contactoReferencia: z.string().optional(),
        telefonoReferencia: z.string().optional(),
        correoReferencia: z.string().email().optional(),
        resultadoVerificacion: z
          .enum(["pendiente", "recomendable", "con_reservas", "no_recomendable"]).optional(),
        observaciones: z.string().optional(),
        estatusInvestigacion: z.enum(ESTATUS_INVESTIGACION).optional(),
        comentarioInvestigacion: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const id = await db.createWorkHistory({
        ...input,
        fechaInicio: normalizeWorkDateInput(input.fechaInicio) ?? "",
        fechaFin: normalizeWorkDateInput(input.fechaFin) ?? "",
      });
      return { id } as const;
    }),

  update: protectedProcedure
    .use(requirePermission("candidatos", "edit"))
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          empresa: z.string().min(1).optional(),
          puesto: z.string().optional(),
          fechaInicio: z
            .string()
            .regex(/^\d{4}(-\d{2})?(-\d{2})?$/)
            .optional(),
          fechaFin: z
            .string()
            .regex(/^\d{4}(-\d{2})?(-\d{2})?$/)
            .optional(),
          tiempoTrabajado: z.string().optional(),
          tiempoTrabajadoEmpresa: z.string().optional(),
          causalSalidaRH: z.enum(CAUSALES_SALIDA).optional(),
          causalSalidaJefeInmediato: z.enum(CAUSALES_SALIDA).optional(),
          contactoReferencia: z.string().optional(),
          telefonoReferencia: z.string().optional(),
          correoReferencia: z.string().email().optional(),
          resultadoVerificacion: z
            .enum(["pendiente", "recomendable", "con_reservas", "no_recomendable"]).optional(),
          observaciones: z.string().optional(),
          estatusInvestigacion: z.enum(ESTATUS_INVESTIGACION).optional(),
          comentarioInvestigacion: z.string().optional(),
          capturadoPor: z.enum(["candidato", "analista"]).optional(),
          // [FIX] Agregar investigacionDetalle para guardar datos de verificación
          investigacionDetalle: z.object({
            empresa: z.object({
              nombreComercial: z.string().optional(),
              giro: z.string().optional(),
              direccion: z.string().optional(),
              telefono: z.string().optional(),
            }).optional(),
            puesto: z.object({
              puestoInicial: z.string().optional(),
              puestoFinal: z.string().optional(),
              jefeInmediato: z.string().optional(),
              principalesActividades: z.string().optional(),
              recursosAsignados: z.string().optional(),
              horarioTrabajo: z.string().optional(),
            }).optional(),
            periodo: z.object({
              fechaIngreso: z.string().optional(),
              fechaSalida: z.string().optional(),
              antiguedadTexto: z.string().optional(),
              sueldoInicial: z.string().optional(),
              sueldoFinal: z.string().optional(),
            }).optional(),
            /** ARCH-20260128-20 | Doc: context/SPEC-INVESTIGACION-INCIDENCIAS-DUAL.md */
            incidencias: z.object({
              motivoSeparacionCandidato: z.string().optional(),
              motivoSeparacionEmpresa: z.string().optional(),
              incapacidadesCandidato: z.string().optional(),
              incapacidadesEmpresa: z.string().optional(),
              inasistenciasCandidato: z.string().optional(),
              inasistenciasEmpresa: z.string().optional(),
              antecedentesLegalesCandidato: z.string().optional(),
              antecedentesLegalesEmpresa: z.string().optional(),
              // legacy
              incapacidadesJefe: z.string().optional(),
              inasistencias: z.string().optional(),
              antecedentesLegales: z.string().optional(),
            }).optional(),
          }).optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      const data: Record<string, unknown> = { ...input.data };
      if ("fechaInicio" in input.data) {
        data.fechaInicio = normalizeWorkDateInput(input.data.fechaInicio) ?? "";
      }
      if ("fechaFin" in input.data) {
        data.fechaFin = normalizeWorkDateInput(input.data.fechaFin) ?? "";
      }

      await db.updateWorkHistory(input.id, data as any);

      // Si se marca como "terminado", intentar generar el mini-dictamen IA.
      if (input.data.estatusInvestigacion === "terminado") {
        void maybeGenerateIaDictamen({ id: input.id });
      }

      return { success: true } as const;
    }),

  delete: protectedProcedure
    .use(requirePermission("candidatos", "edit"))
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteWorkHistory(input.id);
      return { success: true } as const;
    }),

  // Guarda la investigación laboral (incluye matriz de desempeño) y calcula un puntaje numérico 0–100
  saveInvestigation: protectedProcedure
    .use(requirePermission("candidatos", "edit"))
    .input(
      z.object({
        id: z.number(),
        empresa: z
          .object({
            giro: z.string().optional(),
            direccion: z.string().optional(),
            telefono: z.string().optional(),
          })
          .optional(),
        puesto: z
          .object({
            puestoInicial: z.string().optional(),
            puestoFinal: z.string().optional(),
            jefeInmediato: z.string().optional(),
            principalesActividades: z.string().optional(),
            recursosAsignados: z.string().optional(),
            horarioTrabajo: z.string().optional(),
          })
          .optional(),
        periodo: z
          .object({
            antiguedadTexto: z.string().optional(),
            sueldoInicial: z.string().optional(),
            sueldoFinal: z.string().optional(),
            periodos: z
              .array(
                z.object({
                  periodoEmpresa: z.string().optional(),
                  periodoCandidato: z.string().optional(),
                }),
              )
              .optional(),
          })
          .optional(),
        incidencias: z
          .object({
            motivoSeparacionCandidato: z.string().optional(),
            motivoSeparacionEmpresa: z.string().optional(),
            incapacidadesCandidato: z.string().optional(),
            incapacidadesEmpresa: z.string().optional(),
            inasistenciasCandidato: z.string().optional(),
            inasistenciasEmpresa: z.string().optional(),
            antecedentesLegalesCandidato: z.string().optional(),
            antecedentesLegalesEmpresa: z.string().optional(),
            // legacy
            incapacidadesJefe: z.string().optional(),
            inasistencias: z.string().optional(),
            antecedentesLegales: z.string().optional(),
          })
          .optional(),
        desempeno: z
          .object({
            evaluacionGeneral: ratingSchema.optional(),
            puntualidad: ratingSchema.optional(),
            colaboracion: ratingSchema.optional(),
            responsabilidad: ratingSchema.optional(),
            actitudAutoridad: ratingSchema.optional(),
            actitudSubordinados: ratingSchema.optional(),
            honradezIntegridad: ratingSchema.optional(),
            calidadTrabajo: ratingSchema.optional(),
            liderazgo: ratingSchema.optional(),
            conflictividad: z.enum(["SI", "NO"]).optional(),
            conflictividadComentario: z.string().optional(),
          })
          .optional(),
        conclusion: z
          .object({
            esRecomendable: z.enum(["SI", "NO", "CONDICIONADO"]).optional(),
            loRecontrataria: z.enum(["SI", "NO"]).optional(),
            razonRecontratacion: z.string().optional(),
            informanteNombre: z.string().optional(),
            informanteCargo: z.string().optional(),
            informanteTelefono: z.string().optional(),
            informanteEmail: z.string().optional(),
            comentariosAdicionales: z.string().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, empresa, puesto, periodo, incidencias, desempeno, conclusion } = input;

      const ratingsOnly = desempeno
        ? {
            evaluacionGeneral: desempeno.evaluacionGeneral,
            puntualidad: desempeno.puntualidad,
            colaboracion: desempeno.colaboracion,
            responsabilidad: desempeno.responsabilidad,
            actitudAutoridad: desempeno.actitudAutoridad,
            actitudSubordinados: desempeno.actitudSubordinados,
            honradezIntegridad: desempeno.honradezIntegridad,
            calidadTrabajo: desempeno.calidadTrabajo,
            liderazgo: desempeno.liderazgo,
          }
        : {};

      const numericValues = Object.values(ratingsOnly)
        .filter((v): v is keyof typeof RATING_VALUES => !!v)
        .map(v => RATING_VALUES[v]);

      let score: number | null = null;
      if (numericValues.length > 0) {
        const avg = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
        score = Math.round((avg / 4) * 100);
      }

      const details: any = {};
      if (empresa) details.empresa = empresa;
      if (puesto) details.puesto = puesto;
      if (periodo) details.periodo = periodo;
      if (incidencias) details.incidencias = incidencias;

      const hasDesempenoValues =
        desempeno &&
        (numericValues.length > 0 ||
          !!desempeno.conflictividad ||
          !!desempeno.conflictividadComentario);
      if (hasDesempenoValues) {
        details.desempeno = {
          evaluacionGeneral: desempeno.evaluacionGeneral,
          puntualidad: desempeno.puntualidad,
          colaboracion: desempeno.colaboracion,
          responsabilidad: desempeno.responsabilidad,
          actitudAutoridad: desempeno.actitudAutoridad,
          actitudSubordinados: desempeno.actitudSubordinados,
          honradezIntegridad: desempeno.honradezIntegridad,
          calidadTrabajo: desempeno.calidadTrabajo,
          liderazgo: desempeno.liderazgo,
          conflictividad: desempeno.conflictividad,
          conflictividadComentario: desempeno.conflictividadComentario,
        };
      }

      if (conclusion) {
        details.conclusion = conclusion;
      }

      // Mapear esRecomendable (en conclusión) a resultadoVerificacion (campo tabla)
      let resultadoVerificacion: string | undefined = undefined;
      if (conclusion?.esRecomendable) {
        const mapping: Record<string, "recomendable" | "con_reservas" | "no_recomendable"> = {
          SI: "recomendable",
          CONDICIONADO: "con_reservas",
          NO: "no_recomendable",
        };
        resultadoVerificacion = mapping[conclusion.esRecomendable];
      }

      // Registrar cambio en audit trail
      const auditEntry = {
        timestamp: new Date().toISOString(),
        changedBy: "unknown", // En contexto protegido, debería ser ctx.user.name
        action: "update" as const,
        changedFields: details as Record<string, any>,
      };

      const existingDetail = await db.getWorkHistoryById(id);
      const existingAuditTrail = (existingDetail as any)?.investigacionDetalle?.auditTrail ?? [];
      const updatedAuditTrail = [...existingAuditTrail, auditEntry];

      // Preservar campos existentes, agregar nuevos
      const mergedDetails = {
        ...(existingDetail as any)?.investigacionDetalle ?? {},
        ...details,
        auditTrail: updatedAuditTrail,
      };

      await db.updateWorkHistory(id, {
        investigacionDetalle: Object.keys(details).length > 0 ? (mergedDetails as any) : undefined,
        desempenoScore: score ?? undefined,
        resultadoVerificacion: resultadoVerificacion ?? undefined,
      } as any);

      // No generar automáticamente; el mini dictamen se genera manualmente cuando el usuario
      // presiona el botón (solo disponible cuando estatusInvestigacion = "terminado")

      return { success: true, score } as const;
    }),

  // Genera (o regenera) explícitamente el mini-dictamen IA para un empleo
  generateIaDictamen: protectedProcedure
    .use(requirePermission("candidatos", "edit"))
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const work = await db.getWorkHistoryById(input.id);
        if (!work) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Historial laboral no encontrado." });
        }

        if (!ENV.forgeApiKey) {
          throw new TRPCError({
            code: "FAILED_PRECONDITION",
            message: "La API de IA no está configurada (falta API key).",
          });
        }

        if (work.estatusInvestigacion !== "terminado") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Para generar el mini dictamen IA, primero marca la investigación de este empleo como 'Terminada'.",
          });
        }

        if (!work.resultadoVerificacion || work.resultadoVerificacion === "pendiente") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "Define el resultado de verificación (recomendable / con reservas / no recomendable) antes de pedir el mini dictamen IA.",
          });
        }

        await maybeGenerateIaDictamen({ id: input.id });

        const refreshed = await db.getWorkHistoryById(input.id);
        const detalle: any = refreshed?.investigacionDetalle || {};
        const hasIa = !!detalle.iaDictamen;

        return { ok: true, generated: hasIa } as const;
      } catch (error) {
        // Asegurar respuesta tRPC válida (evitar que Express devuelva un 500 genérico no-transformable)
        try {
          logger.error("workHistory.generateIaDictamen failed", {
            requestId: ctx.requestId,
            workHistoryId: input.id,
            error: error instanceof Error ? error.message : String(error),
          });
        } catch {
          // no-op
        }

        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No se pudo generar el mini dictamen IA. Intenta nuevamente.",
        });
      }
    }),
});
