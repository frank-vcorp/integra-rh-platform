import { randomBytes } from 'crypto';
import { eq, and, gt } from 'drizzle-orm';
import { getDb } from '../db';
import { clientAccessTokens, clients } from '../../drizzle/schema';

/**
 * Genera un token único aleatorio de 32 bytes (64 caracteres hex)
 */
export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Crea un nuevo token de acceso para un cliente
 * @param clientId ID del cliente empresarial
 * @param expiresInDays Días hasta que expire el token (default: 30)
 * @returns Token generado
 */
export async function createClientAccessToken(
  clientId: number,
  expiresInDays: number = 30,
  scope?: { procesoId?: number; candidatoId?: number }
): Promise<string> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  await db.insert(clientAccessTokens).values({
    token,
    clientId,
    procesoId: scope?.procesoId,
    candidatoId: scope?.candidatoId,
    expiresAt,
  } as any);

  return token;
}

/**
 * Valida un token y devuelve el cliente asociado si es válido
 * @param token Token a validar
 * @returns Cliente si el token es válido, null si no
 */
export async function validateClientToken(token: string) {
  console.log('[validateClientToken] Iniciando validación, token:', token.substring(0, 20) + '...');
  
  const db = await getDb();
  if (!db) {
    console.log('[validateClientToken] Base de datos no disponible');
    return null;
  }

  const now = new Date();
  console.log('[validateClientToken] Fecha actual:', now.toISOString());

  // Buscar token válido (no expirado)
  const result = await db
    .select({
      token: clientAccessTokens,
      client: clients,
    })
    .from(clientAccessTokens)
    .innerJoin(clients, eq(clientAccessTokens.clientId, clients.id))
    .where(and(eq(clientAccessTokens.token, token), gt(clientAccessTokens.expiresAt, now)))
    .limit(1);

  console.log('[validateClientToken] Resultados encontrados:', result.length);
  
  if (result.length === 0) {
    console.log('[validateClientToken] No se encontró token válido');
    return null;
  }

  if ((result[0] as any).token?.revokedAt) {
    console.log('[validateClientToken] Token revocado');
    return null;
  }
  console.log('[validateClientToken] Token válido encontrado para cliente:', result[0].client.nombreEmpresa);
  
  // Actualizar lastUsedAt
  await db.update(clientAccessTokens).set({ lastUsedAt: now }).where(eq(clientAccessTokens.token, token));

  return result[0].client;
}

/**
 * Revoca (elimina) un token de acceso
 * @param token Token a revocar
 */
export async function revokeClientToken(token: string): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  await db.update(clientAccessTokens).set({ revokedAt: new Date() }).where(eq(clientAccessTokens.token, token));
}

/**
 * Revoca todos los tokens de un cliente
 * @param clientId ID del cliente
 */
export async function revokeAllClientTokens(clientId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error('Database not available');
  }

  await db.delete(clientAccessTokens).where(eq(clientAccessTokens.clientId, clientId));
}

/**
 * Obtiene el enlace de acceso completo para un cliente
 * @param token Token generado
 * @param baseUrl URL base de la aplicación
 * @returns URL completa de acceso
 */
export function getClientAccessUrl(token: string, baseUrl: string): string {
  return `${baseUrl}/cliente/${token}`;
}
