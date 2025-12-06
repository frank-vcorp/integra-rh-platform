import { router, protectedProcedure, requirePermission, hasPermission } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";

const ESTATUS_INVESTIGACION = ["en_revision", "revisado", "terminado"] as const;

const CAUSALES_SALIDA = [
  "RENUNCIA VOLUNTARIA",
  "TÉRMINO DE CONTRATO",
  "CIERRE DE LA EMPRESA",
  "JUVILACIÓN",
  "ABANDONO DE TRABAJO",
  "ACUMULACIÓN DE FALTAS",
  "BAJO DESEMPEÑO",
  "FALTA DE PROBIDAD",
  "VIOLACIÓN AL CÓDIGO DE CONDUCTA",
  "ABUSO DE CONFIANZA",
  "INCUMPLIMIENTO A POLÍTICAS Y PROCESOS",
  "OTRO",
] as const;

const RATING_VALUES = {
  EXCELENTE: 4,
  BUENO: 3,
  REGULAR: 2,
  MALO: 1,
} as const;

const ratingSchema = z.enum(["EXCELENTE", "BUENO", "REGULAR", "MALO"]);

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
        fechaInicio: z.string().optional(),
        fechaFin: z.string().optional(),
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
      const id = await db.createWorkHistory(input);
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
          fechaInicio: z.string().optional(),
          fechaFin: z.string().optional(),
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
        }),
      })
    )
    .mutation(async ({ input }) => {
      await db.updateWorkHistory(input.id, input.data);
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

      await db.updateWorkHistory(id, {
        investigacionDetalle: Object.keys(details).length > 0 ? (details as any) : undefined,
        desempenoScore: score ?? undefined,
      } as any);

      return { success: true, score } as const;
    }),
});
