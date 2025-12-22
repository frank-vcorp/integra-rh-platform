import { router, publicProcedure, protectedProcedure, adminProcedure, hasPermission, requirePermission } from "../_core/trpc";
import { z } from "zod";
import * as db from "../db";
import { TRPCError } from "@trpc/server";
import { logAuditEvent } from "../_core/audit";
import { UNAUTHED_ERR_MSG } from "@shared/const.ts";

export const candidatesRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    console.log("[candidates.list] headers:", ctx.req.headers);

    // 1) Si hay usuario en contexto (admin o client) usarlo
    if (ctx.user?.role === "admin") {
      if (!hasPermission(ctx, "candidatos", "view")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No puedes ver candidatos" });
      }
      return db.getCandidatesWithInvestigationProgress();
    }
    if (ctx.user?.role === "client" && ctx.user.clientId) {
      return db.getCandidatesWithInvestigationProgress(ctx.user.clientId);
    }

    // 2) Si no hay usuario, intentar autenticar con ClientToken directo
    const authHeader =
      ctx.req.headers["authorization"] ||
      (ctx.req.headers["Authorization" as any] as string | string[] | undefined);
    const header = Array.isArray(authHeader) ? authHeader[0] : authHeader;

    if (typeof header === "string" && header.startsWith("ClientToken ")) {
      const token = header.slice("ClientToken ".length).trim();
      const { validateClientToken } = await import("../auth/clientTokens");
      const client = await validateClientToken(token);
      if (client) {
        return db.getCandidatesByClient(client.id);
      }
    }

    throw new TRPCError({ code: "UNAUTHORIZED", message: "Please login (10001)" });
  }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const candidate = await db.getCandidateById(input.id);

      // 1) Si hay usuario en contexto, aplicar reglas por rol
      if (ctx.user) {
        if (ctx.user.role === "client") {
          if (candidate && candidate.clienteId !== ctx.user.clientId) {
            return null;
          }
          return candidate;
        }

        // Usuarios internos: requieren permiso de lectura
        if (!hasPermission(ctx, "candidatos", "view")) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No puedes ver candidatos" });
        }
        return candidate;
      }

      // 2) Si no hay usuario, intentar autenticar con ClientToken directo
      const authHeader =
        ctx.req.headers["authorization"] ||
        (ctx.req.headers["Authorization" as any] as string | string[] | undefined);
      const header = Array.isArray(authHeader) ? authHeader[0] : authHeader;

      if (typeof header === "string" && header.startsWith("ClientToken ")) {
        const token = header.slice("ClientToken ".length).trim();
        const { validateClientToken } = await import("../auth/clientTokens");
        const client = await validateClientToken(token);
        if (!client) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
        }

        if (candidate && candidate.clienteId !== client.id) {
          return null;
        }
        return candidate;
      }

      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }),

  create: adminProcedure
    .use(requirePermission("candidatos", "create"))
    .input(
      z.object({
        nombreCompleto: z.string().min(1),
        email: z.string().email().optional(),
        telefono: z.string().optional(),
        medioDeRecepcion: z.string().optional(),
        clienteId: z.number().optional(),
        clientSiteId: z.number().optional(),
        puestoId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const id = await db.createCandidate(input as any);

      await logAuditEvent(ctx, {
        action: "create",
        entityType: "candidate",
        entityId: id,
        details: {
          nombreCompleto: input.nombreCompleto,
          clienteId: input.clienteId,
          puestoId: input.puestoId,
        },
      });

      return { id } as const;
    }),

  update: adminProcedure
    .use(requirePermission("candidatos", "edit"))
    .input(
      z.object({
        id: z.number(),
        data: z.object({
          nombreCompleto: z.string().min(1).optional(),
          email: z.string().email().optional(),
          telefono: z.string().optional(),
          medioDeRecepcion: z.string().optional(),
          clienteId: z.number().optional(),
          clientSiteId: z.number().optional(),
          puestoId: z.number().optional(),
          psicometricos: z.any().optional(),
        }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await db.updateCandidate(input.id, input.data as any);

      await logAuditEvent(ctx, {
        action: "update",
        entityType: "candidate",
        entityId: input.id,
        details: input.data as any,
      });

      return { success: true } as const;
    }),

  delete: adminProcedure
    .use(requirePermission("candidatos", "delete"))
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await db.deleteCandidate(input.id);

      await logAuditEvent(ctx, {
        action: "delete",
        entityType: "candidate",
        entityId: input.id,
      });

      return { success: true } as const;
    }),

  markSelfFilledReviewed: adminProcedure
    .use(requirePermission("candidatos", "edit"))
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      const candidate = await db.getCandidateById(input.id);
      if (!candidate) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Candidato no encontrado",
        });
      }

      await db.updateCandidate(input.id, {
        selfFilledStatus: "revisado",
        selfFilledReviewedBy: ctx.user?.id,
        selfFilledReviewedAt: new Date(),
      } as any);

      await logAuditEvent(ctx, {
        action: "review",
        entityType: "candidate",
        entityId: input.id,
        details: {
          selfFilledStatus: "revisado",
        },
      });

      return { ok: true } as const;
    }),
});
