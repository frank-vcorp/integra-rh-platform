/**
 * Helpers para gestión de tokens de acceso único para clientes
 */

import { drizzle } from "drizzle-orm/mysql2";
import { eq, and, gt } from "drizzle-orm";
import { clientAccessTokens } from "../../drizzle/schema";
import crypto from "crypto";

/**
 * Genera un token único seguro
 */
function generateSecureToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Calcula fecha de expiración (30 días desde ahora)
 */
function getExpirationDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date;
}

/**
 * Genera un nuevo token de acceso para un cliente
 * @param clientId ID del cliente
 * @returns Token generado
 */
export async function generateClientAccessToken(clientId: number): Promise<string> {
  const db = drizzle(process.env.DATABASE_URL!);
  
  const token = generateSecureToken();
  const expiresAt = getExpirationDate();

  await db.insert(clientAccessTokens).values({
    clientId,
    token,
    expiresAt,
  });

  return token;
}

/**
 * Valida un token y retorna el clientId si es válido
 * @param token Token a validar
 * @returns clientId si el token es válido, null si no
 */
export async function validateClientAccessToken(token: string): Promise<number | null> {
  const db = drizzle(process.env.DATABASE_URL!);

  const result = await db
    .select()
    .from(clientAccessTokens)
    .where(
      and(
        eq(clientAccessTokens.token, token),
        gt(clientAccessTokens.expiresAt, new Date())
      )
    )
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  // Actualizar última vez usado
  await db
    .update(clientAccessTokens)
    .set({ lastUsedAt: new Date() })
    .where(eq(clientAccessTokens.token, token));

  return result[0].clientId;
}

/**
 * Invalida (elimina) un token específico
 * @param token Token a invalidar
 */
export async function invalidateClientAccessToken(token: string): Promise<void> {
  const db = drizzle(process.env.DATABASE_URL!);
  
  await db
    .delete(clientAccessTokens)
    .where(eq(clientAccessTokens.token, token));
}

/**
 * Invalida todos los tokens de un cliente
 * @param clientId ID del cliente
 */
export async function invalidateAllClientTokens(clientId: number): Promise<void> {
  const db = drizzle(process.env.DATABASE_URL!);
  
  await db
    .delete(clientAccessTokens)
    .where(eq(clientAccessTokens.clientId, clientId));
}

/**
 * Obtiene todos los tokens activos de un cliente
 * @param clientId ID del cliente
 */
export async function getActiveClientTokens(clientId: number) {
  const db = drizzle(process.env.DATABASE_URL!);
  
  return await db
    .select()
    .from(clientAccessTokens)
    .where(
      and(
        eq(clientAccessTokens.clientId, clientId),
        gt(clientAccessTokens.expiresAt, new Date())
      )
    );
}
