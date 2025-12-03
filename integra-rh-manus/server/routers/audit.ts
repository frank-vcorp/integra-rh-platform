import { router, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { auditLogs, users } from "../../drizzle/schema";
import { desc, eq } from "drizzle-orm";

export const auditRouter = router({
  list: adminProcedure
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(500).optional(),
          userId: z.number().optional(),
          action: z.string().optional(),
          entityType: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];

      const limit = input?.limit ?? 200;

      let query = db
        .select({
          id: auditLogs.id,
          timestamp: auditLogs.timestamp,
          userId: auditLogs.userId,
          actorType: auditLogs.actorType,
          action: auditLogs.action,
          entityType: auditLogs.entityType,
          entityId: auditLogs.entityId,
          requestId: auditLogs.requestId,
          details: auditLogs.details,
          userName: users.name,
          userEmail: users.email,
        })
        .from(auditLogs)
        .leftJoin(users, eq(auditLogs.userId, users.id))
        .orderBy(desc(auditLogs.timestamp))
        .limit(limit);

      // Filtros sencillos en memoria por ahora para mantener consulta simple
      const rows = await query;

      return rows.filter((row) => {
        if (input?.userId && row.userId !== input.userId) return false;
        if (input?.action && row.action !== input.action) return false;
        if (input?.entityType && row.entityType !== input.entityType) return false;
        return true;
      });
    }),
});

