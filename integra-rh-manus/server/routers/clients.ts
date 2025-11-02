import { z } from 'zod';
import { router, protectedProcedure } from '../trpc.ts';
import { db } from '../../scripts/db';
import { clients } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const clientsRouter = router({
  /**
   * Devuelve una lista de todos los clientes.
   * Protegido, solo para usuarios autenticados.
   */
  list: protectedProcedure.query(async () => {
    return await db.select().from(clients).orderBy(clients.nombreEmpresa);
  }),

  /**
   * Devuelve un cliente específico por su ID.
   * Protegido, solo para usuarios autenticados.
   */
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const client = await db.select().from(clients).where(eq(clients.id, input.id));
      if (!client[0]) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Cliente no encontrado.' });
      }
      return client[0];
    }),
});