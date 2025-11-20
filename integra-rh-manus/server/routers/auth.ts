import { router, protectedProcedure, publicProcedure } from '../trpc.ts';
import { z } from 'zod';

export const authRouter = router({
  /**
   * Endpoint protegido que devuelve los datos del usuario autenticado.
   * Si se llama sin un token válido, el middleware `isAuthenticated`
   * lanzará un error 'UNAUTHORIZED' antes de que se ejecute esta lógica.
   */
  me: protectedProcedure.query(({ ctx }) => {
    // Gracias al middleware, aquí sabemos que `ctx.user` no es nulo.
    return ctx.user;
  }),

  // No-op en el backend: usamos Firebase en el cliente.
  // Dejamos el endpoint para mantener compatibilidad con el hook useAuth.
  logout: protectedProcedure.mutation(() => {
    return { ok: true as const };
  }),
});
