import { z } from 'zod';
import { router, protectedProcedure } from '../trpc.ts';
import { TRPCError } from '@trpc/server';
import { createClient, getAllClients, getClientById } from "../db";

export const clientsRouter = router({
  /**
   * Devuelve una lista de todos los clientes.
   * Protegido, solo para usuarios autenticados.
   */
  list: protectedProcedure.query(async () => {
    return await getAllClients();
  }),

  /**
   * Devuelve un cliente específico por su ID.
   * Protegido, solo para usuarios autenticados.
   */
  get: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const client = await getClientById(input.id);
      if (!client) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Cliente no encontrado.' });
      }
      return client;
    }),

  /** Crear cliente (solo administradores) */
  create: protectedProcedure
    .input(z.object({
      nombreEmpresa: z.string().min(1),
      rfc: z.string().optional(),
      direccion: z.string().optional(),
      telefono: z.string().optional(),
      email: z.string().email().optional(),
      nombreContacto: z.string().optional(),
      puestoContacto: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Solo administradores pueden crear clientes' });
      }
      const id = await createClient({
        nombreEmpresa: input.nombreEmpresa,
        rfc: input.rfc ?? null,
        direccion: input.direccion ?? null,
        telefono: input.telefono ?? null,
        email: input.email ?? null,
        nombreContacto: input.nombreContacto ?? null,
        puestoContacto: input.puestoContacto ?? null,
      } as any);
      return { id } as const;
    }),

  /** Actualizar cliente (solo administradores) */
  update: protectedProcedure
    .input(z.object({
      id: z.number().int(),
      data: z.object({
        nombreEmpresa: z.string().min(1).optional(),
        rfc: z.string().optional(),
        direccion: z.string().optional(),
        telefono: z.string().optional(),
        email: z.string().email().optional(),
        nombreContacto: z.string().optional(),
        puestoContacto: z.string().optional(),
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Solo administradores pueden actualizar clientes' });
      }
      const { id, data } = input;
      const { updateClient } = await import('../db');
      await updateClient(id, data as any);
      return { ok: true } as const;
    }),

  /** Eliminar cliente (solo administradores) */
  delete: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Solo administradores pueden eliminar clientes' });
      }
      const { deleteClient } = await import('../db');
      await deleteClient(input.id);
      return { ok: true } as const;
    }),
});
