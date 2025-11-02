import { router, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";

export const paymentsRouter = router({
  list: adminProcedure.query(async () => {
    return db.getAllPayments();
  }),

  listBySurveyor: adminProcedure
    .input(z.object({ encuestadorId: z.number().int() }))
    .query(async ({ input }) => {
      return db.getPaymentsBySurveyor(input.encuestadorId);
    }),

  create: adminProcedure
    .input(z.object({
      procesoId: z.number().int(),
      encuestadorId: z.number().int(),
      monto: z.number().int().nonnegative(), // en centavos
      metodoPago: z.string().optional(),
      observaciones: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const id = await db.createPayment({
        procesoId: input.procesoId,
        encuestadorId: input.encuestadorId,
        monto: input.monto,
        estatusPago: "pendiente" as any,
        metodoPago: input.metodoPago,
        observaciones: input.observaciones,
      } as any);
      return { id } as const;
    }),

  update: adminProcedure
    .input(z.object({
      id: z.number().int(),
      data: z.object({
        estatusPago: z.enum(["pendiente","pagado"]).optional(),
        fechaPago: z.coerce.date().optional(),
        metodoPago: z.string().optional(),
        observaciones: z.string().optional(),
      }),
    }))
    .mutation(async ({ input }) => {
      await db.updatePayment(input.id, input.data as any);
      return { ok: true } as const;
    }),
});
