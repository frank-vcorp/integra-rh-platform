import { router, protectedProcedure, adminProcedure, requirePermission } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";

export const processCommentsRouter = router({
  getByProcess: protectedProcedure
    .use(requirePermission("procesos", "view"))
    .input(z.object({ procesoId: z.number() }))
    .query(async ({ input, ctx }) => {
      // Si es cliente, validar que el proceso pertenece a su cliente
      if (ctx.user.role === 'client') {
        const proc = await db.getProcessById(input.procesoId);
        if (!proc || proc.clienteId !== ctx.user.clientId) return [];
      }
      return db.getProcessComments(input.procesoId);
    }),

  create: adminProcedure
    .use(requirePermission("procesos", "edit"))
    .input(z.object({ procesoId: z.number(), text: z.string().min(1), statusAtTime: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      const author = ctx.user.name || ctx.user.email || 'Admin';
      const id = await db.createProcessComment({
        procesoId: input.procesoId,
        text: input.text,
        author,
        processStatusAtTime: input.statusAtTime,
      } as any);
      return { id } as const;
    }),
});
