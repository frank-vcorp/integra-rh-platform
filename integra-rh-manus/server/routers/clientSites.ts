import { z } from "zod";
import { router, protectedProcedure, requirePermission } from "../_core/trpc";
import {
  createClientSite,
  getClientSitesByClient,
} from "../db";
import { TRPCError } from "@trpc/server";

export const clientSitesRouter = router({
  /** Lista plazas activas de un cliente */
  listByClient: protectedProcedure
    .use(requirePermission("clientes", "view"))
    .input(z.object({ clientId: z.number().int() }))
    .query(async ({ input }) => {
      return getClientSitesByClient(input.clientId);
    }),

  /** Crear una nueva plaza para un cliente */
  create: protectedProcedure
    .use(requirePermission("clientes", "edit"))
    .input(
      z.object({
        clientId: z.number().int(),
        nombrePlaza: z.string().min(1),
        ciudad: z.string().optional(),
        estado: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo administradores pueden crear plazas",
        });
      }
      const id = await createClientSite({
        clientId: input.clientId,
        nombrePlaza: input.nombrePlaza,
        ciudad: input.ciudad ?? null,
        estado: input.estado ?? null,
      } as any);
      return { id } as const;
    }),
});

