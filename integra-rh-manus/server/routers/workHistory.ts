import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";

export const workHistoryRouter = router({
  getByCandidate: protectedProcedure
    .input(z.object({ candidatoId: z.number() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role === "client") {
        const candidate = await db.getCandidateById(input.candidatoId);
        if (candidate?.clienteId !== ctx.user.clientId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
      }
      return db.getWorkHistoryByCandidate(input.candidatoId);
    }),

  create: adminProcedure
    .input(
      z.object({
        candidatoId: z.number(),
        empresa: z.string().min(1),
        puesto: z.string().optional(),
        fechaInicio: z.string().optional(),
        fechaFin: z.string().optional(),
        tiempoTrabajado: z.string().optional(),
        contactoReferencia: z.string().optional(),
        telefonoReferencia: z.string().optional(),
        correoReferencia: z.string().email().optional(),
        resultadoVerificacion: z
          .enum(["pendiente", "recomendable", "con_reservas", "no_recomendable"]).optional(),
        observaciones: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const id = await db.createWorkHistory(input);
      return { id } as const;
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          empresa: z.string().min(1).optional(),
          puesto: z.string().optional(),
          fechaInicio: z.string().optional(),
          fechaFin: z.string().optional(),
          tiempoTrabajado: z.string().optional(),
          contactoReferencia: z.string().optional(),
          telefonoReferencia: z.string().optional(),
          correoReferencia: z.string().email().optional(),
          resultadoVerificacion: z
            .enum(["pendiente", "recomendable", "con_reservas", "no_recomendable"]).optional(),
          observaciones: z.string().optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      await db.updateWorkHistory(input.id, input.data);
      return { success: true } as const;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteWorkHistory(input.id);
      return { success: true } as const;
    }),
});

