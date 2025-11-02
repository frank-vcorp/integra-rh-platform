# Histórico: Integración Manus (archivada)

Estado: archivado el 2025-11-02. El proyecto usa solo Firebase Auth.

Resumen
- Se removió la integración con Manus (OAuth, plugin de Vite y componentes UI).
- Objetivo: simplificar autenticación a Firebase ID token en cliente y verificación en servidor.

Componentes que existían (ahora eliminados)
- Vite:
  - Plugin: `vite-plugin-manus-runtime` (eliminado de `vite.config.ts` y `package.json`).
  - `allowedHosts` incluía dominios `*.manus*` (limpiado; quedan `localhost` y `127.0.0.1`).
- Backend:
  - SDK OAuth: `server/_core/sdk.ts` (borrado).
  - Rutas OAuth: `server/_core/oauth.ts` (borrado) con endpoint `GET /api/oauth/callback`.
  - Variables de entorno asociadas: `OAUTH_SERVER_URL`, `VITE_APP_ID`, `JWT_SECRET` (removidas de `server/_core/env.ts`).
  - Cookies de sesión (JWT) con `COOKIE_NAME` (usadas por el SDK).
- Frontend:
  - Diálogo de Manus: `client/src/components/ManusDialog.tsx` (borrado).
  - Generación de URL de login hacia portal OAuth (sustituida por `/login`).

Cómo se veía el flujo antes
1) Cliente construía URL hacia portal OAuth (utilizando `VITE_OAUTH_PORTAL_URL`/`VITE_APP_ID`).
2) Tras autenticación, el portal redirigía a `/api/oauth/callback`.
3) El servidor intercambiaba el `code` por `accessToken`, consultaba `userinfo`, creaba cookie JWT y redirigía a `/`.

Estado actual (Firebase)
- Login en `/login` con Google usando `firebase/auth` en el cliente.
- El cliente adjunta `Authorization: Bearer <idToken>` en tRPC (configurado en `client/src/main.tsx`).
- El servidor verifica `idToken` con Firebase Admin en `server/_core/context.ts` y crea/actualiza el usuario en DB.

Cómo restaurar Manus en el código (si fuera necesario)
- Referencia de estado sin Manus: tag `checkpoint-2025-11-02-remove-manus`.
- Para recuperar archivos eliminados desde el commit antes de la limpieza (padre de `cdc45be`):
  - Ver commits: `git log --oneline -n 5`
  - Ejemplo para restaurar un archivo eliminado desde el commit padre:
    - `git checkout cdc45be^ -- integra-rh-manus/server/_core/sdk.ts`
    - `git checkout cdc45be^ -- integra-rh-manus/server/_core/oauth.ts`
    - `git checkout cdc45be^ -- integra-rh-manus/client/src/components/ManusDialog.tsx`
    - Re-añadir plugin en `vite.config.ts` y devDependency `vite-plugin-manus-runtime` en `package.json`.
- Variables necesarias para Manus (histórico):
  - Servidor: `OAUTH_SERVER_URL`, `JWT_SECRET`, opcionalmente `OWNER_OPEN_ID`.
  - Cliente: `VITE_APP_ID`, `VITE_OAUTH_PORTAL_URL`.

Equivalencias (Manus ➜ Firebase)
- Portal OAuth ➜ `/login` (React + Firebase Auth: Google popup con fallback a redirect).
- Cookie JWT de sesión ➜ `Authorization: Bearer <Firebase ID token>`.
- Verificación `verifySession(jwt)` ➜ `adminAuth.verifyIdToken(idToken)`.
- Ruta `/api/oauth/callback` ➜ no aplica.
- `vite-plugin-manus-runtime` ➜ no aplica.

Notas
- Esta guía sirve como histórico. La implementación activa vive en `docs/AUTH_FIREBASE.md`.

