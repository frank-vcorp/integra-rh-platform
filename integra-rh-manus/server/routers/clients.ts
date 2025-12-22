import { z } from 'zod';
import { router, protectedProcedure, requirePermission } from '../_core/trpc';
import { TRPCError } from '@trpc/server';
import { createClient, createClientSite, getAllClients, getClientById } from "../db";
import { logAuditEvent } from "../_core/audit";

export const clientsRouter = router({
  /**
   * Devuelve una lista de todos los clientes.
   * Protegido, solo para usuarios autenticados.
   */
  list: protectedProcedure
    .use(requirePermission("clientes", "view"))
    .query(async () => {
    return await getAllClients();
  }),

  /**
   * Devuelve un cliente específico por su ID.
   * Protegido, solo para usuarios autenticados.
   */
  get: protectedProcedure
    .use(requirePermission("clientes", "view"))
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
    .use(requirePermission("clientes", "create"))
    .input(z.object({
      nombreEmpresa: z.string().min(1),
      ubicacionPlaza: z.string().optional(),
      reclutador: z.string().optional(),
      contacto: z.string().optional(),
      telefono: z.string().optional(),
      email: z.string().email().optional(),
      iaSuggestionsEnabled: z.boolean().optional(),
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
        iaSuggestionsEnabled: input.iaSuggestionsEnabled ?? false,
      } as any);

      // Crear una plaza principal basada en ubicacionPlaza, si se proporcionó.
      const plaza = input.ubicacionPlaza?.trim();
      if (plaza) {
        await createClientSite({
          clientId: id,
          nombrePlaza: plaza,
          ciudad: null,
          estado: null,
          activo: true,
        } as any);
      }

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
    .use(requirePermission("clientes", "edit"))
    .input(z.object({
      id: z.number().int(),
      data: z.object({
        nombreEmpresa: z.string().min(1).optional(),
        ubicacionPlaza: z.string().optional(),
        reclutador: z.string().optional(),
        contacto: z.string().optional(),
        telefono: z.string().optional(),
        email: z.string().email().optional(),
        iaSuggestionsEnabled: z.boolean().optional(),
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
      if (data.iaSuggestionsEnabled !== undefined) {
        payload.iaSuggestionsEnabled = data.iaSuggestionsEnabled;
      }
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
    .use(requirePermission("clientes", "delete"))
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
