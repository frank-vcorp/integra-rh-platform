import { router, publicProcedure } from '../trpc.ts';
import { authRouter } from './auth';
import { clientsRouter } from './clients';
import { postsRouter } from './posts';
import { clientAccessRouter } from './clientAccess';
import { workHistoryRouter } from './workHistory';
import { candidateCommentsRouter } from './candidateComments';
import { psicometricasRouter } from './psicometricas';
import { emailRouter } from './email';
import { candidatesRouter } from './candidates';
import { processesRouter } from './processes';
import { documentsRouter } from './documents';
import { processCommentsRouter } from './processComments';
import { surveyorsRouter } from './surveyors';
import { usersRouter } from './users';
import { paymentsRouter } from './payments';
import { surveyorMessagesRouter } from './surveyorMessages';

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

  // Conectamos el router de clientes bajo el prefijo 'clients'
  clients: clientsRouter,

  // Conectamos el router de puestos bajo el prefijo 'posts'
  posts: postsRouter,

  // Routers públicos para acceso de clientes mediante token
  clientAccess: clientAccessRouter,

  // Historial laboral y comentarios de candidatos
  workHistory: workHistoryRouter,
  candidateComments: candidateCommentsRouter,

  // Candidatos y Procesos
  candidates: candidatesRouter,
  processes: processesRouter,
  documents: documentsRouter,
  processComments: processCommentsRouter,
  surveyors: surveyorsRouter,

  // Integraciones
  psicometricas: psicometricasRouter,
  users: usersRouter,
  payments: paymentsRouter,
  surveyorMessages: surveyorMessagesRouter,
});

// Exportamos el tipo del router. El cliente lo usará para tener autocompletado y tipado.
export type AppRouter = typeof appRouter;

