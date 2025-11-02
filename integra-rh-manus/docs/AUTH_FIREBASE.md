# Autenticación con Firebase (actual)

Resumen
- El login se realiza en `/login` con Firebase Auth (proveedor Google).
- El cliente adjunta `Authorization: Bearer <idToken>` en llamadas tRPC.
- El servidor verifica el `idToken` con Firebase Admin, resuelve/crea usuario y autoriza.

Componentes relevantes
- Cliente
  - `client/src/pages/Login.tsx`: inicia sesión con `signInWithPopup` y fallback a `signInWithRedirect`; procesa `getRedirectResult` al volver.
  - `client/src/main.tsx`: inyecta header `Authorization` con `getAuth().currentUser.getIdToken()` en `httpBatchLink`.
  - `client/src/contexts/AuthContext.tsx`: deriva estado `user` desde `onAuthStateChanged` y consulta `auth.me`.
  - `client/src/const.ts`: `getLoginUrl()` devuelve siempre `/login`.
- Servidor
  - `server/_core/context.ts`: valida `Authorization: Bearer <idToken>` con `admin.auth().verifyIdToken()` y resuelve `user` (upsert si falta).
  - `server/firebase.ts`: inicializa Admin sin ADC; usa `FIREBASE_PROJECT_ID` y `FIREBASE_STORAGE_BUCKET`.
  - `server/_core/index.ts`: expone `/api/trpc` y Vite en dev.

Variables de entorno necesarias
- Cliente (`.env`):
  - `VITE_API_URL=/api/trpc`
  - `VITE_FIREBASE_API_KEY`
  - `VITE_FIREBASE_AUTH_DOMAIN`
  - `VITE_FIREBASE_PROJECT_ID`
  - `VITE_FIREBASE_APP_ID`
  - `VITE_FIREBASE_MESSAGING_SENDER_ID`
  - `VITE_FIREBASE_MEASUREMENT_ID`
  - `VITE_APP_TITLE`, `VITE_APP_LOGO` (UI)
- Servidor (`.env`):
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_STORAGE_BUCKET` (opcional si se usa el default)
  - `DATABASE_URL`
  - `NODE_ENV=development` para Vite en dev (recomendado)

Requisitos en Firebase Console
- Authentication > Sign-in method > Google: Enabled.
- Authentication > Settings > Authorized domains: incluir `localhost` y `127.0.0.1`.

Arranque local
1) `pnpm tsx watch ./server/_core/index.ts`
2) Abrir `http://localhost:3000` y pulsar “Iniciar sesión con Google”.

Diagnóstico rápido
- 401 `auth.me`: revisar que el servidor imprime el bucket y no muestra “Unable to detect a Project Id…”. Asegura `FIREBASE_PROJECT_ID`.
- Loop tras login: verificar que el popup no fue bloqueado y que el redirect fallback ejecuta `getRedirectResult` (está implementado en `Login.tsx`).

Histórico
- La integración previa con Manus se archivó en `docs/HISTORICO_MANUS.md`.

