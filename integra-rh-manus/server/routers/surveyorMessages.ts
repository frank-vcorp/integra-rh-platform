import { router, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";

export const surveyorMessagesRouter = router({
  listBySurveyor: adminProcedure
    .input(z.object({ encuestadorId: z.number().int() }))
    .query(async ({ input }) => {
      return db.getSurveyorMessagesBySurveyor(input.encuestadorId);
    }),

  create: adminProcedure
    .input(z.object({
      encuestadorId: z.number().int(),
      procesoId: z.number().int().nullable().optional(),
      canal: z.enum(["whatsapp","email","sms","otro"]).default("whatsapp"),
      contenido: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const id = await db.createSurveyorMessage({
        encuestadorId: input.encuestadorId,
        procesoId: input.procesoId ?? null,
        canal: input.canal as any,
        contenido: input.contenido,
      } as any);
      return { id } as const;
    }),
});

