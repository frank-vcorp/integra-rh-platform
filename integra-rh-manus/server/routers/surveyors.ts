import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";

export const surveyorsRouter = router({
  getById: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      return db.getSurveyorById(input.id);
    }),
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
      cobertura: z.enum(["local","foraneo","ambos"]).optional(),
      ciudadBase: z.string().optional(),
      estadosCobertura: z.array(z.string()).optional(),
      radioKm: z.number().int().nonnegative().optional(),
      vehiculo: z.boolean().optional(),
      tarifaLocal: z.number().int().nonnegative().optional(),
      tarifaForanea: z.number().int().nonnegative().optional(),
      notas: z.string().optional(),
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
        cobertura: z.enum(["local","foraneo","ambos"]).optional(),
        ciudadBase: z.string().optional(),
        estadosCobertura: z.array(z.string()).optional(),
        radioKm: z.number().int().nonnegative().optional(),
        vehiculo: z.boolean().optional(),
        tarifaLocal: z.number().int().nonnegative().optional(),
        tarifaForanea: z.number().int().nonnegative().optional(),
        notas: z.string().optional(),
        activo: z.boolean().optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      await db.updateSurveyor(input.id, input.data as any);
      return { ok: true } as const;
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      await db.deleteSurveyor(input.id);
      return { ok: true } as const;
    }),
});
