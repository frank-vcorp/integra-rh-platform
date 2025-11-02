import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { db } from '../../scripts/db';
import { posts } from '../../drizzle/schema';
import { eq, desc } from 'drizzle-orm';

export const postsRouter = router({
  /**
   * Lista global de puestos (ordenados por creación desc)
   */
  list: protectedProcedure.query(async () => {
    return await db.select().from(posts).orderBy(desc(posts.createdAt));
  }),

  /**
   * Devuelve una lista de todos los puestos asociados a un cliente específico.
   * Protegido, solo para usuarios autenticados.
   */
  listByClient: protectedProcedure
    .input(
      z.object({
        clientId: z.number(),
      })
    )
    .query(async ({ input }) => {
      return await db.select().from(posts).where(eq(posts.clienteId, input.clientId));
    }),

  /**
   * Crea un nuevo puesto (protegido). Idealmente restringido a admin; por ahora
   * requiere autenticación. Se puede reforzar con guardas de rol.
   */
  create: protectedProcedure
    .input(
      z.object({
        nombreDelPuesto: z.string().min(1),
        clienteId: z.number(),
        descripcion: z.string().optional(),
        estatus: z.enum(["activo", "cerrado", "pausado"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const res: any = await (db as any).insert(posts).values({
        nombreDelPuesto: input.nombreDelPuesto,
        clienteId: input.clienteId,
        descripcion: input.descripcion,
        estatus: input.estatus ?? 'activo',
      });
      const insertId = Array.isArray(res) ? res[0]?.insertId : res?.insertId;
      return { id: insertId } as const;
    }),
});
