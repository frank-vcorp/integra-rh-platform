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

/**
 * IMPL-20260408-06
 * Respaldo: PROYECTO.md
 * Refrescador de URLs de Firebase Storage para documentos y evidencias legacy.
 */

type StorageLocation = {
  bucketName: string;
  objectPath: string;
};

/**
 * Extrae el object path de una URL de Firebase/GCS Storage.
 * Retorna null si la URL no corresponde a storage de GCS/Firebase.
 */
function extractStorageLocation(url: string): StorageLocation | null {
  try {
    // Formato 1: https://storage.googleapis.com/<bucket>/<path>?...
    const gcMatch = url.match(/https:\/\/storage\.googleapis\.com\/([^/]+)\/([^?]+)/);
    if (gcMatch) {
      return { bucketName: gcMatch[1], objectPath: gcMatch[2] };
    }

    // Formato 2: https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<encodedPath>?...
    const fbMatch = url.match(/https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/([^/]+)\/o\/([^?]+)/);
    if (fbMatch) {
      return { bucketName: fbMatch[1], objectPath: decodeURIComponent(fbMatch[2]) };
    }
  } catch { /* URL malformada */ }
  return null;
}

function isSameProjectBucket(currentBucketName: string, candidateBucketName: string): boolean {
  if (currentBucketName === candidateBucketName) return true;
  return currentBucketName.split(".")[0] === candidateBucketName.split(".")[0];
}

/**
 * Refresca una URL de Firebase Storage generando una signed URL de lectura (15 min).
 * - Prioriza fileKey para regenerar directamente desde el bucket activo.
 * - Si solo hay URL legacy, intenta extraer el object path del patrón GCS/Firebase.
 * - Si no puede regenerar (CDN externo, error de credenciales, fileKey corrupto),
 *   conserva la URL original y emite un log estructurado con `code`, `msg`,
 *   `context`, `fileKey` y `urlPrefix` para diagnóstico post-mortem.
 *
 * @intervention IMPL-20260408-06
 * @intervention IMPL-ARCH-20260622-01 — agrega `context` y warn estructurado
 * @respaldo context/SPECs/SPEC-ARCH-20260622-01-fix-storage-upload-no-such-key.md §3.3
 * @respaldo context/decisions/ADR-ARCH-20260622-01-fix-storage-upload-no-such-key.md §4.3
 */
export async function refreshStorageUrl(
  url: string | null | undefined,
  fileKey?: string | null,
  context?: { procesoId?: number; candidatoId?: number; docId?: number },
): Promise<string> {
  if (!url && !fileKey) return url ?? '';
  try {
    const bucket = storage.bucket();
    const storageLocation = !fileKey && url ? extractStorageLocation(url) : null;
    if (storageLocation && !isSameProjectBucket(bucket.name, storageLocation.bucketName)) {
      return url ?? '';
    }

    const objectPath = fileKey ?? storageLocation?.objectPath ?? null;
    if (!objectPath) return url ?? '';

    const [signedUrl] = await bucket.file(objectPath).getSignedUrl({
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000,
    });
    return signedUrl;
  } catch (err) {
    const msg = (err as Error)?.message ?? '';
    const code = (err as { code?: unknown })?.code ?? 'UNKNOWN';
    // IMPL-ARCH-20260622-01: warn estructurado (JSON en una sola línea) para que sea
    // fácil de grepear en logs y no enmascare el NoSuchKey original.
    console.warn(
      '[refreshStorageUrl] FAILED',
      JSON.stringify({
        code,
        msg,
        context: context ?? {},
        fileKey,
        urlPrefix: url?.slice(0, 120),
      }),
    );
    // Devolver la URL original para que la UI al menos intente abrir.
    // Si el operador ve NoSuchKey, ya quedó log para diagnóstico.
    return url ?? '';
  }
}

/**
 * Refresca un arreglo de URLs de storage (filtra falsy, retorna strings).
 * @intervention IMPL-20260408-06
 */
export async function refreshStorageUrls(urls: (string | null | undefined)[]): Promise<string[]> {
  return Promise.all(
    urls
      .filter((u): u is string => Boolean(u))
      .map((u) => refreshStorageUrl(u)),
  );
}
