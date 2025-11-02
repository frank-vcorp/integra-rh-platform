import admin from 'firebase-admin';
import fs from 'node:fs';
import path from 'node:path';

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

if (!admin.apps.length) {
  const storageBucket = pickBucketName();
  const envProjectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;

  // Intenta usar la credencial explícita del archivo GOOGLE_APPLICATION_CREDENTIALS
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  let usedExplicitCred = false;
  if (credPath) {
    try {
      const abs = path.isAbsolute(credPath) ? credPath : path.join(process.cwd(), credPath);
      const json = JSON.parse(fs.readFileSync(abs, 'utf8')) as any;
      admin.initializeApp({
        credential: admin.credential.cert(json),
        projectId: json.project_id || envProjectId,
        storageBucket,
      });
      usedExplicitCred = true;
      try { console.log('[FirebaseAdmin] Initialized with explicit service account. project_id:', json.project_id || envProjectId); } catch {}
    } catch (e) {
      try { console.warn('[FirebaseAdmin] Failed to load explicit credentials, falling back to ADC:', (e as Error).message); } catch {}
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
