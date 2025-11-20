# Checkpoint 20251119-1850 — auth/cors/cloudrun

## Resumen
- Se alineó logout/login con Firebase (limpieza de tokens cliente + redirección y refresh de idToken).
- Se habilitó CORS para `https://integra-rh.web.app` y se ajustó el contexto de auth para tolerar caídas de DB (fallback a claims).
- Se añadió soporte de conexión a Cloud Run (socket `/cloudsql/...`) y Dockerfile multistage.
- Hosting de Firebase apunta a `dist/public` y build usa `NODE_ENV=production`.

## Archivos clave
- `client/src/_core/hooks/useAuth.ts`: logout sincroniza Firebase, limpia tokens cliente y redirige.
- `client/src/components/DashboardLayout.tsx`: botón “Salir” en móvil/desktop; menú admin por defecto hasta conocer rol.
- `client/src/pages/Login.tsx`: usa `AuthContext` y refresca idToken tras Google/password.
- `server/_core/context.ts`: auth resiliente; fallback a usuario efímero con claims.
- `server/_core/index.ts`: CORS `https://integra-rh.web.app`.
- `server/routers/auth.ts`: `logout` no-op (compatibilidad hook).
- `server/db.ts`: pool por socket en Cloud Run, TCP local si no hay `K_SERVICE`.
- `firebase.json`: hosting → `integra-rh-manus/dist/public`.
- `package.json`: build con `NODE_ENV=production`.
- `Dockerfile`: build multistage para Cloud Run.
- `drizzle/0012_tan_ezekiel_stane.sql`, `scripts/fix-users-whatsapp.ts`: soporte WhatsApp ya aplicado.

## Comandos ejecutados
- `pnpm run build` (ok). Bundle client ~1.3 MB minificado (warning de tamaño, sin fallo).

## Pendiente / sugerido
- Probar login/logout end-to-end en `https://integra-rh.web.app/`.
- PVM-PRC-01 y PVM-WEB-03 siguen en progreso; OBS/SEC/REL pendientes.
- Opcional: dividir bundles grandes y añadir healthcheck/metrics para Cloud Run.
