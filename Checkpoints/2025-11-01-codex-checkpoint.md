# Checkpoint 2025-11-01 — Integra RH (Codex)

Estado actual
- Frontend y API unificados en server core (Vite + Express) en `http://localhost:3000`.
- Autenticación: Firebase únicamente (se eliminó dependencia de Manus/OAuth + cookies).
- tRPC expuesto en `/api/trpc` y cliente apunta a esa ruta.
- Variables `.env` actualizadas para Firebase y placeholders de index.html.
- Router público `clientAccess` agregado (validateToken, getClientData).

Cambios aplicados (archivos clave)
- `client/src/main.tsx`: importa `"@/lib/firebase"` para inicializar Firebase.
- `server/index.ts`: ruta tRPC → `/api/trpc` (en modo API simple).
- `server/_core/index.ts`: deshabilita rutas OAuth Manus.
- `server/_core/context.ts`: elimina `sdk.authenticateRequest`; acepta `Authorization: Bearer <Firebase ID token>` y upserta usuario.
- `server/routers/clientAccess.ts`: nuevo router con `validateToken` y `getClientData`.
- `server/routers/index.ts`: incluye `clientAccess`.
- `.env`: `VITE_API_URL=/api/trpc` + `VITE_APP_*` placeholders y claves Firebase.
- `.env.example`: añade `VITE_FIREBASE_*`, `VITE_API_URL`, y claves backend comunes.

Cómo iniciar (dev unificado)
1) PowerShell en `integra-rh-manus`:
   - `pnpm install`
   - (opcional Admin SDK) `$env:GOOGLE_APPLICATION_CREDENTIALS="$PWD\firebase-admin-sdk.json"`
   - `pnpm tsx watch ./server/_core/index.ts`
2) Abrir `http://localhost:3000`.

Verificaciones para Gemini
- Login: `http://localhost:3000/login` → botón "Sign in with Google".
  - En Firebase Console: Auth → Sign-in method → Google (Enable) y Dominios autorizados: `localhost`.
- Red: llamadas a `/api/trpc/*` incluyen header `Authorization: Bearer <idToken>` después del login.
- No aparecen logs de `[OAuth]` ni `[Auth] Missing session cookie` tras reinicio del server.
- Variables de index.html resueltas: favicon, título y script de analytics no rompe.
- Existencia de router público: `/api/trpc/clientAccess.validateToken` responde y `/api/trpc/clientAccess.getClientData` devuelve datos al pasar un token válido.

Notas
- Si persiste el ciclo de login, verificar popup bloqueado o proveedor Google no habilitado; como fallback puede usarse `signInWithRedirect`.
- Si se requiere API separada, usar `pnpm tsx watch ./server/index.ts` (API) y `pnpm vite` (client) y ajustar `VITE_API_URL` a `http://localhost:3000/api/trpc`.
