import { router, protectedProcedure, adminProcedure, requirePermission } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";

export const candidateCommentsRouter = router({
  getByCandidate: protectedProcedure
    .use(requirePermission("candidatos", "view"))
    .input(z.object({ candidatoId: z.number() }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role === "client") {
        const candidate = await db.getCandidateById(input.candidatoId);
        if (candidate?.clienteId !== ctx.user.clientId) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        // Clientes solo ven comentarios públicos
        const all = await db.getCandidateComments(input.candidatoId);
        return all.filter((c: any) => c.visibility === "public");
      }
      return db.getCandidateComments(input.candidatoId);
    }),

  create: adminProcedure
    .use(requirePermission("candidatos", "edit"))
    .input(
      z.object({
        candidatoId: z.number(),
        text: z.string().min(1),
        visibility: z.enum(["public", "internal"]).optional().default("internal"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const id = await db.createCandidateComment({
        candidatoId: input.candidatoId,
        text: input.text,
        author: ctx.user.name || ctx.user.email || "Admin",
        visibility: input.visibility ?? "internal",
      } as any);
      return { id } as const;
    }),
});
