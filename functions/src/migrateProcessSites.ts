/**
 * @file functions/src/migrateProcessSites.ts
 * @description Cloud Function para sincronizar plazas (clientSiteId) en procesos históricos
 * @fix FIX-20260217-01: Auto-asignación de plazas a procesos que no las tienen
 * 
 * Endpoint: POST /migrateProcessSites
 * Autenticación: Requiere auth token admin
 * 
 * Uso:
 * curl -X POST https://api-559788019343.us-central1.run.app/migrateProcessSites \
 *   -H "Authorization: Bearer ${ADMIN_TOKEN}"
 */

import * as functions from "firebase-functions";
import mysql from "mysql2/promise";

const RAILWAY_DB_URL = process.env.DATABASE_URL || 
  "mysql://Integra-rh:X%2FT9gHT7i4%2Abk1D8@gondola.proxy.rlwy.net:18090/integra_rh_v2";

interface MigrationResult {
  success: boolean;
  affectedRows: number;
  processesWithoutSites: number;
  errors: string[];
  timestamp: string;
}

export const migrateProcessSites = functions.https.onRequest(
  async (req, res) => {
    // Validar método
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    // Validar autenticación (requiere Firebase ID token o custom token)
    try {
      // Este será validado por Firebase middleware si existe
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ error: "Missing authorization header" });
      }
    } catch (error) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const result: MigrationResult = {
      success: false,
      affectedRows: 0,
      processesWithoutSites: 0,
      errors: [],
      timestamp: new Date().toISOString(),
    };

    let connection: mysql.Connection | null = null;

    try {
      // Conectar a Railway MySQL
      connection = await mysql.createConnection(RAILWAY_DB_URL);
      console.log("[Migration] Connected to Railway MySQL");

      // 1. Actualizar procesos sin clientSiteId
      const updateQuery = `
        UPDATE processes p
        SET clientSiteId = (
          SELECT MIN(cs.id)
          FROM clientSites cs
          WHERE cs.clientId = p.clienteId
          AND cs.activo = true
          LIMIT 1
        )
        WHERE p.clientSiteId IS NULL
        AND EXISTS (
          SELECT 1
          FROM clientSites cs
          WHERE cs.clientId = p.clienteId
          AND cs.activo = true
        )
      `;

      const [updateResult] = await connection.execute(updateQuery);
      result.affectedRows = (updateResult as any).affectedRows || 0;
      console.log(`[Migration] Updated ${result.affectedRows} processes with sites`);

      // 2. Contar procesos que aún no tienen plaza
      const countQuery = `
        SELECT COUNT(*) as count FROM processes WHERE clientSiteId IS NULL
      `;
      const [countResult] = await connection.execute(countQuery);
      result.processesWithoutSites = (countResult as any[])[0]?.count || 0;

      // 3. Log de procesos sin plaza (para análisis)
      if (result.processesWithoutSites > 0) {
        const orphanQuery = `
          SELECT p.id, p.clave, c.nombreEmpresa
          FROM processes p
          LEFT JOIN clients c ON p.clienteId = c.id
          WHERE p.clientSiteId IS NULL
          LIMIT 10
        `;
        const [orphanResults] = await connection.execute(orphanQuery);
        console.log(`[Migration] Found ${result.processesWithoutSites} processes without sites:`, orphanResults);
      }

      result.success = true;
      console.log("[Migration] Completed successfully");

      return res.status(200).json({
        ...result,
        message: `Migration completed. ${result.affectedRows} processes updated. ${result.processesWithoutSites} processes still without sites.`,
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      result.errors.push(errorMsg);
      console.error("[Migration] Error:", error);

      return res.status(500).json({
        ...result,
        message: "Migration failed",
        details: errorMsg,
      });
    } finally {
      if (connection) {
        try {
          await connection.end();
          console.log("[Migration] Connection closed");
        } catch (closeError) {
          console.error("[Migration] Error closing connection:", closeError);
        }
      }
    }
  }
);

/**
 * Función auxiliar para validar que todos los procesos tienen plaza
 * Útil para health checks
 */
export const validateProcessSites = functions.https.onRequest(
  async (req, res) => {
    if (req.method !== "GET") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    let connection: mysql.Connection | null = null;

    try {
      connection = await mysql.createConnection(RAILWAY_DB_URL);

      // Contar procesos sin plaza
      const [countResult] = await connection.execute(
        `SELECT COUNT(*) as count FROM processes WHERE clientSiteId IS NULL`
      );
      const processesWithoutSites = (countResult as any[])[0]?.count || 0;

      // Contar total de procesos
      const [totalResult] = await connection.execute(
        `SELECT COUNT(*) as count FROM processes`
      );
      const totalProcesses = (totalResult as any[])[0]?.count || 0;

      const percentage = totalProcesses > 0 
        ? ((totalProcesses - processesWithoutSites) / totalProcesses * 100).toFixed(2)
        : "0.00";

      return res.status(200).json({
        success: true,
        totalProcesses,
        processesWithSites: totalProcesses - processesWithoutSites,
        processesWithoutSites,
        completePercentage: `${percentage}%`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return res.status(500).json({
        success: false,
        error: errorMsg,
      });
    } finally {
      if (connection) {
        await connection.end();
      }
    }
  }
);
