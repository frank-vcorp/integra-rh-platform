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
      // Campos UI actuales
      ubicacionPlaza: z.string().optional(),
      reclutador: z.string().optional(),
      contacto: z.string().optional(),
      telefono: z.string().optional(),
      email: z.string().email().optional(),
      // Campos del esquema DB (también permitidos por compatibilidad)
      rfc: z.string().optional(),
      direccion: z.string().optional(),
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
        // Mapear nombres del UI al esquema de DB
        direccion: (input.direccion ?? input.ubicacionPlaza) ?? null,
        telefono: input.telefono ?? null,
        email: input.email ?? null,
        nombreContacto: (input.nombreContacto ?? input.contacto) ?? null,
        puestoContacto: (input.puestoContacto ?? input.reclutador) ?? null,
      } as any);
      return { id } as const;
    }),

  /** Actualizar cliente (solo administradores) */
  update: protectedProcedure
    .input(z.object({
      id: z.number().int(),
      data: z.object({
        nombreEmpresa: z.string().min(1).optional(),
        // UI
        ubicacionPlaza: z.string().optional(),
        reclutador: z.string().optional(),
        contacto: z.string().optional(),
        telefono: z.string().optional(),
        email: z.string().email().optional(),
        // DB
        rfc: z.string().optional(),
        direccion: z.string().optional(),
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
      const payload: any = {
        ...(['nombreEmpresa','rfc','telefono','email'].reduce((acc, k) => ({...acc, [k]: (data as any)[k]}), {} as any)),
      };
      // Mapear y priorizar si vienen desde el UI
      if (data.direccion !== undefined || data.ubicacionPlaza !== undefined) {
        payload.direccion = (data.direccion ?? data.ubicacionPlaza) ?? null;
      }
      if (data.nombreContacto !== undefined || data.contacto !== undefined) {
        payload.nombreContacto = (data.nombreContacto ?? data.contacto) ?? null;
      }
      if (data.puestoContacto !== undefined || data.reclutador !== undefined) {
        payload.puestoContacto = (data.puestoContacto ?? data.reclutador) ?? null;
      }
      await updateClient(id, payload);
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
