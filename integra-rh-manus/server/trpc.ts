import { TRPCError, initTRPC } from '@trpc/server';
import type { Context } from './context';
import superjson from 'superjson';

/**
 * Inicialización de tRPC. Esto solo se hace una vez en todo el proyecto.
 */
const t = initTRPC.context<Context>().create({
  // Configuramos superjson como el transformador de datos
  transformer: superjson,
});

// Middleware de autenticación
const isAuthenticated = t.middleware(({ ctx, next }) => {
  // Verificamos si el contexto tiene un usuario.
  // Si no lo tiene, lanzamos un error de 'UNAUTHORIZED'.
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  // Si hay usuario, continuamos al siguiente middleware o al procedimiento.
  return next({
    ctx: {
      // El contexto ahora sabe que `user` no es nulo.
      user: ctx.user,
    },
  });
});

/**
 * Exportamos los bloques reutilizables para construir nuestra API.
 * - router: Para crear nuevos grupos de endpoints (ej: `clientsRouter`, `postsRouter`).
 * - publicProcedure: Para crear endpoints que no requieren autenticación.
 * - protectedProcedure: Para crear endpoints que SÍ requieren autenticación.
 */
export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthenticated);
