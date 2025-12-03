import { z } from 'zod';
import { router, protectedProcedure } from '../trpc.ts';
import { TRPCError } from '@trpc/server';
import { createClient, getAllClients, getClientById } from "../db";
import { logAuditEvent } from "../_core/audit";

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
      ubicacionPlaza: z.string().optional(),
      reclutador: z.string().optional(),
      contacto: z.string().optional(),
      telefono: z.string().optional(),
      email: z.string().email().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Solo administradores pueden crear clientes' });
      }
      const id = await createClient({
        nombreEmpresa: input.nombreEmpresa,
        ubicacionPlaza: input.ubicacionPlaza ?? null,
        reclutador: input.reclutador ?? null,
        contacto: input.contacto ?? null,
        telefono: input.telefono ?? null,
        email: input.email ?? null,
      } as any);

      await logAuditEvent(ctx, {
        action: "create",
        entityType: "client",
        entityId: id,
        details: input,
      });

      return { id } as const;
    }),

  /** Actualizar cliente (solo administradores) */
  update: protectedProcedure
    .input(z.object({
      id: z.number().int(),
      data: z.object({
        nombreEmpresa: z.string().min(1).optional(),
        ubicacionPlaza: z.string().optional(),
        reclutador: z.string().optional(),
        contacto: z.string().optional(),
        telefono: z.string().optional(),
        email: z.string().email().optional(),
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user?.role !== 'admin') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Solo administradores pueden actualizar clientes' });
      }
      const { id, data } = input;
      const { updateClient } = await import('../db');
      const payload: any = {
        nombreEmpresa: data.nombreEmpresa,
        ubicacionPlaza: data.ubicacionPlaza ?? null,
        reclutador: data.reclutador ?? null,
        contacto: data.contacto ?? null,
        telefono: data.telefono ?? null,
        email: data.email ?? null,
      };
      await updateClient(id, payload);

      await logAuditEvent(ctx, {
        action: "update",
        entityType: "client",
        entityId: id,
        details: payload,
      });

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

      await logAuditEvent(ctx, {
        action: "delete",
        entityType: "client",
        entityId: input.id,
      });

      return { ok: true } as const;
    }),
});
