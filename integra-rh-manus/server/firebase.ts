/**
 * Inicialización Firebase Admin con resolución robusta de credenciales.
 * @intervention IMPL-20260320-12
 * @respaldo context/interconsultas/ARCH-20260320-12
 */
import admin from 'firebase-admin';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Inicializamos la app de Firebase Admin.
// El SDK busca automáticamente la variable de entorno GOOGLE_APPLICATION_CREDENTIALS
// que apunta a nuestro archivo firebase-admin-sdk.json.
// No forzar normalización: respetamos exactamente el nombre de bucket provisto en .env
function pickBucketName() {
  const envRaw = process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET;
  if (envRaw && envRaw.trim().length > 0) return envRaw.trim();
  // Fallback sensato: preferir dominio moderno firebasestorage.app
  return 'integra-rh.firebasestorage.app';
}

/**
 * Busca el archivo de credenciales en múltiples ubicaciones candidatas.
 * Soporta arranque desde la raíz del workspace o desde integra-rh-manus/.
 */
function resolveCredentialPath(credPath: string): string | null {
  const candidates: string[] = [];
  const baseName = path.basename(credPath);

  // 1. Ruta absoluta tal cual
  if (path.isAbsolute(credPath)) candidates.push(credPath);

  // 2. Relativa al cwd (funciona si arranca desde integra-rh-manus/)
  candidates.push(path.join(process.cwd(), credPath));

  // 3. Solo el nombre de archivo en el cwd (si cwd ya contiene el archivo)
  if (baseName !== credPath) candidates.push(path.join(process.cwd(), baseName));

  // 4. Relativa al directorio de este módulo (ESM) y un nivel arriba
  try {
    const moduleDir = path.dirname(fileURLToPath(import.meta.url));
    candidates.push(path.join(moduleDir, credPath));
    candidates.push(path.join(moduleDir, '..', credPath));
    if (baseName !== credPath) candidates.push(path.join(moduleDir, '..', baseName));
  } catch { /* import.meta.url no disponible en todos los entornos de build */ }

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch { /* path inválido */ }
  }

  console.warn('[FirebaseAdmin] Archivo de credenciales no encontrado. Rutas intentadas:', candidates.join(' | '));
  return null;
}

if (!admin.apps.length) {
  const storageBucket = pickBucketName();
  const envProjectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;

  // Intenta usar la credencial explícita del archivo GOOGLE_APPLICATION_CREDENTIALS
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  let usedExplicitCred = false;
  if (credPath) {
    const resolvedPath = resolveCredentialPath(credPath);
    if (resolvedPath) {
      try {
        const json = JSON.parse(fs.readFileSync(resolvedPath, 'utf8')) as any;
        admin.initializeApp({
          credential: admin.credential.cert(json),
          projectId: json.project_id || envProjectId,
          storageBucket,
        });
        usedExplicitCred = true;
        console.log('[FirebaseAdmin] Credenciales cargadas desde:', resolvedPath, '| project_id:', json.project_id || envProjectId);
      } catch (e) {
        console.warn('[FirebaseAdmin] Error al parsear credenciales en', resolvedPath, ':', (e as Error).message);
      }
    }
  }

  if (!usedExplicitCred) {
    // Inicialización sin credenciales (sin ADC) y solo con projectId explícito.
    // verifyIdToken usa certificados públicos, no requiere credenciales.
    admin.initializeApp({
      projectId: envProjectId,
      storageBucket,
    });
    if (!envProjectId) {
      try { console.warn('[FirebaseAdmin] No projectId found in env; set FIREBASE_PROJECT_ID to enable verifyIdToken.'); } catch {}
    }
  }
  // Log no sensible para diagnóstico local
  try { console.log('[FirebaseAdmin] Using storage bucket:', storageBucket); } catch {}
}

export const auth = admin.auth();
export const db = admin.firestore(); // Exportamos firestore por si lo necesitamos en el futuro
export const storage = admin.storage(); // Exportamos storage por si lo necesitamos en el futuro
