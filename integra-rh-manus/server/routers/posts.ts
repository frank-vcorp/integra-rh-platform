import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure, hasPermission, requirePermission } from '../_core/trpc';
import { getAllPosts, getPostsByClient, createPost, updatePost, deletePost } from '../db';

export const postsRouter = router({
  /**
   * Lista global de puestos (ordenados por creación desc)
   */
  list: protectedProcedure
    .query(async ({ ctx }) => {
      if (ctx.user?.role === 'client') {
        if (!ctx.user.clientId) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Please login (10001)' });
        }
        return await getPostsByClient(ctx.user.clientId);
      }

      if (!hasPermission(ctx, 'puestos', 'view')) {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'No puedes ver puestos' });
      }

      return await getAllPosts();
    }),

  /**
   * Devuelve una lista de todos los puestos asociados a un cliente específico.
   * Protegido, solo para usuarios autenticados.
   */
  listByClient: protectedProcedure
    .use(requirePermission("puestos", "view"))
    .input(
      z.object({
        clientId: z.number(),
      })
    )
    .query(async ({ input }) => {
      return await getPostsByClient(input.clientId);
    }),

  /**
   * Crea un nuevo puesto (protegido). Idealmente restringido a admin; por ahora
   * requiere autenticación. Se puede reforzar con guardas de rol.
   */
  create: protectedProcedure
    .use(requirePermission("puestos", "create"))
    .input(
      z.object({
        nombreDelPuesto: z.string().min(1),
        clienteId: z.number(),
        descripcion: z.string().optional(),
        estatus: z.enum(["activo", "cerrado", "pausado"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const id = await createPost({
        nombreDelPuesto: input.nombreDelPuesto,
        clienteId: input.clienteId,
        descripcion: input.descripcion ?? null,
        estatus: input.estatus ?? 'activo',
      } as any);
      return { id } as const;
    }),

  update: protectedProcedure
    .use(requirePermission("puestos", "edit"))
    .input(
      z.object({
        id: z.number().int(),
        data: z.object({
          nombreDelPuesto: z.string().min(1).optional(),
          clienteId: z.number().optional(),
          descripcion: z.string().nullable().optional(),
          estatus: z.enum(["activo", "cerrado", "pausado"]).optional(),
        }),
      })
    )
    .mutation(async ({ input }) => {
      await updatePost(input.id, input.data as any);
      return { ok: true } as const;
    }),

  delete: protectedProcedure
    .use(requirePermission("puestos", "delete"))
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      await deletePost(input.id);
      return { ok: true } as const;
    }),
});
