import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";

export const candidatesRouter = router({
  list: protectedProcedure.query(async () => {
    return db.getAllCandidates();
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return db.getCandidateById(input.id);
    }),

  create: adminProcedure
    .input(
      z.object({
        nombreCompleto: z.string().min(1),
        email: z.string().email().optional(),
        telefono: z.string().optional(),
        medioDeRecepcion: z.string().optional(),
        clienteId: z.number().optional(),
        puestoId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const id = await db.createCandidate(input as any);
      return { id } as const;
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          nombreCompleto: z.string().min(1).optional(),
          email: z.string().email().optional(),
          telefono: z.string().optional(),
          medioDeRecepcion: z.string().optional(),
          clienteId: z.number().optional(),
          puestoId: z.number().optional(),
          psicometricos: z.any().optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      await db.updateCandidate(input.id, input.data as any);
      return { success: true } as const;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.deleteCandidate(input.id);
      return { success: true } as const;
    }),
});

