import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import { auth } from './firebase';
import type { DecodedIdToken } from 'firebase-admin/auth';

/**
 * Crea el contexto para cada solicitud.
 * Aquí es donde pondremos cosas como la sesión del usuario autenticado.
 */
export const createContext = async ({
  req,
  res,
}: CreateExpressContextOptions) => {
  // 1. Extraer el token de la cabecera 'Authorization'
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const idToken = authHeader.split(' ')[1];
    try {
      // 2. Verificar el token con el SDK de Admin de Firebase
      const decodedToken = await auth.verifyIdToken(idToken);
      // 3. Si es válido, lo adjuntamos al contexto
      return { user: decodedToken };
    } catch (error) {
      // El token es inválido o ha expirado
      console.warn('Token de autenticación inválido:', error);
    }
  }

  // Si no hay token o es inválido, el contexto no tendrá usuario
  return { user: null };
};

export type Context = {
  user: DecodedIdToken | null;
};