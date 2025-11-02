import { z } from 'zod';
import { router, publicProcedure, adminProcedure } from '../_core/trpc';
import { validateClientToken, createClientAccessToken, getClientAccessUrl, revokeClientToken } from '../auth/clientTokens';
import * as sendgrid from '../integrations/sendgrid';
import { getDb } from '../db';
import { clients, clientAccessTokens } from '../../drizzle/schema';
import { and, eq, gt, isNull } from 'drizzle-orm';

export const clientAccessRouter = router({
  /**
   * Valida un token de acceso de cliente.
   * Devuelve { valid: boolean, clientId?: number }
   */
  validateToken: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ input }) => {
      const client = await validateClientToken(input.token);
      if (!client) return { valid: false } as const;
      return { valid: true, clientId: client.id } as const;
    }),

  /**
   * Obtiene datos del cliente a partir del token (si es válido y no expirado)
   */
  getClientData: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ input }) => {
      const client = await validateClientToken(input.token);
      if (!client) return null;
      // Si validateClientToken ya devuelve el cliente, retornamos ese objeto.
      // En caso de necesitar datos frescos desde DB, dejamos el siguiente código:
      try {
        const db = await getDb();
        if (!db) return client;
        const result = await db.select().from(clients).where(eq(clients.id, client.id)).limit(1);
        return result?.[0] ?? client;
      } catch {
        return client;
      }
    }),

  create: adminProcedure
    .input(z.object({
      clientId: z.number(),
      procesoId: z.number().optional(),
      candidatoId: z.number().optional(),
      ttlDays: z.number().optional().default(14),
      sendEmailTo: z.string().email().optional(),
      emailContext: z.object({ nombreEmpresa: z.string().optional(), nombreCandidato: z.string().optional(), claveProceso: z.string().optional() }).optional(),
      baseUrl: z.string().optional().default('http://localhost:3000'),
    }))
    .mutation(async ({ input }) => {
      const token = await createClientAccessToken(input.clientId, input.ttlDays, { procesoId: input.procesoId, candidatoId: input.candidatoId });
      const url = getClientAccessUrl(token, input.baseUrl!);
      if (input.sendEmailTo) {
        await sendgrid.enviarEnlaceAccesoCliente(
          input.sendEmailTo,
          input.emailContext?.nombreEmpresa || 'Cliente',
          input.emailContext?.nombreCandidato || '',
          input.emailContext?.claveProceso || '',
          url
        );
      }
      return { token, url } as const;
    }),

  revoke: adminProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ input }) => {
      await revokeClientToken(input.token);
      return { ok: true } as const;
    }),

  /**
   * Lista tokens activos (no expirados y no revocados) de un cliente
   */
  listActiveTokens: adminProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [] as any[];
      const now = new Date();
      const rows = await db
        .select()
        .from(clientAccessTokens)
        .where(and(
          eq(clientAccessTokens.clientId, input.clientId),
          gt(clientAccessTokens.expiresAt, now),
          isNull(clientAccessTokens.revokedAt)
        ));
      return rows.map(r => ({
        token: r.token,
        expiresAt: r.expiresAt,
        lastUsedAt: r.lastUsedAt,
        procesoId: (r as any).procesoId,
        candidatoId: (r as any).candidatoId,
      }));
    }),
});
