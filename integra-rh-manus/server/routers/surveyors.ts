import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";

export const surveyorsRouter = router({
  list: adminProcedure.query(async () => {
    return db.getAllSurveyors();
  }),

  listActive: protectedProcedure.query(async () => {
    return db.getActiveSurveyors();
  }),

  create: adminProcedure
    .input(z.object({
      nombre: z.string().min(1),
      telefono: z.string().optional(),
      email: z.string().email().optional(),
      activo: z.boolean().optional().default(true),
    }))
    .mutation(async ({ input }) => {
      const id = await db.createSurveyor({
        nombre: input.nombre,
        telefono: input.telefono,
        email: input.email,
        activo: input.activo ?? true,
      } as any);
      return { id } as const;
    }),

  update: adminProcedure
    .input(z.object({
      id: z.number(),
      data: z.object({
        nombre: z.string().min(1).optional(),
        telefono: z.string().optional(),
        email: z.string().email().optional(),
        activo: z.boolean().optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      await db.updateSurveyor(input.id, input.data as any);
      return { ok: true } as const;
    }),
});

