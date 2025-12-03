import { router, protectedProcedure, publicProcedure } from '../trpc.ts';
import { z } from 'zod';
import { logAuditEvent } from "../_core/audit";

export const authRouter = router({
  /**
   * Endpoint protegido que devuelve los datos del usuario autenticado.
   * Si se llama sin un token válido, el middleware `isAuthenticated`
   * lanzará un error 'UNAUTHORIZED' antes de que se ejecute esta lógica.
   */
  me: protectedProcedure.query(async ({ ctx }) => {
    // Registro de acceso (login efectivo al backend)
    await logAuditEvent(ctx, {
      action: "login",
      entityType: "user",
      entityId: ctx.user.id,
      details: {
        email: ctx.user.email,
        role: ctx.user.role,
      },
    });

    return ctx.user;
  }),

  // No-op en el backend: usamos Firebase en el cliente.
  // Dejamos el endpoint para mantener compatibilidad con el hook useAuth.
  logout: protectedProcedure.mutation(async ({ ctx }) => {
    await logAuditEvent(ctx, {
      action: "logout",
      entityType: "user",
      entityId: ctx.user.id,
      details: {
        email: ctx.user.email,
        role: ctx.user.role,
      },
    });
    return { ok: true as const };
  }),
});
