import { router, publicProcedure } from '../trpc';
import { authRouter } from './auth';
import { z } from 'zod';

/**
 * Este es el router principal de nuestra aplicación.
 * Aquí combinaremos todos los demás routers (clientes, puestos, etc.).
 */
export const appRouter = router({
  // Creamos un endpoint de prueba para verificar que todo funciona.
  // Se podrá llamar desde el cliente como `trpc.healthcheck.query()`
  healthcheck: publicProcedure.query(() => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }),

  // Conectamos el router de autenticación bajo el prefijo 'auth'
  auth: authRouter,
});

// Exportamos el tipo del router. El cliente lo usará para tener autocompletado y tipado.
export type AppRouter = typeof appRouter;