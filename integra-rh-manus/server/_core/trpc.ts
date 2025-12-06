import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG, type PermissionAction, type PermissionModule } from '@shared/const.ts';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export function hasPermission(
  ctx: TrpcContext,
  module: PermissionModule,
  action: PermissionAction
) {
  if (!ctx.user) return false;
  if (ctx.isSuperadmin) return true;
  if (ctx.user.role === "client") return false;

  // Compatibilidad: si es admin pero aún no tiene roles asignados,
  // asumimos acceso completo como antes.
  if (!ctx.permissions || ctx.permissions.length === 0) {
    return ctx.user.role === "admin";
  }

  return ctx.permissions.some(
    (p) => p.module === module && p.action === action
  );
}

export function requirePermission(
  module: PermissionModule,
  action: PermissionAction
) {
  return t.middleware(({ ctx, next }) => {
    if (!hasPermission(ctx, module, action)) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({ ctx });
  });
}

export const adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;

    if (!ctx.user || (ctx.user.role !== "admin" && !ctx.isSuperadmin)) {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  })
);
