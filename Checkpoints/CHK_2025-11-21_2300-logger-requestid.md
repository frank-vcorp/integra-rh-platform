# Checkpoint: Logger estructurado + requestId (2025-11-21 23:00)

## Contexto
- Se implementó la tarea **PVM-OBS-01** descrita en `PROYECTO.md` / `context/SPEC-PVM-OBS-01.md`.
- Objetivo: tener trazabilidad básica en Cloud Run mediante logs JSON estructurados y un `requestId` por cada petición.

## Cambios realizados

1. **Logger estructurado mínimo**
   - Nuevo archivo `integra-rh-manus/server/_core/logger.ts`.
   - Expone `logger.info / logger.warn / logger.error` que:
     - Generan líneas JSON con campos: `ts`, `level`, `msg` y metadatos extra.
     - Dirigen la salida a `console.log / console.warn / console.error` para que Cloud Run / Cloud Logging las capture.
   - Utilidad `logger.ensureRequestId()` para normalizar/generar un `requestId` cuando hace falta.

2. **Asignación de requestId en Express / Cloud Run**
   - `server/_core/index.ts`:
     - Middleware inicial que:
       - Lee `x-request-id` si viene de proxy o genera uno nuevo (`UUID`).
       - Lo guarda en `req.requestId` y loguea `incoming_request` con método y path.
     - Webhook Psicométricas ahora usa `logger`:
       - En caso de secreto inválido: `"[Webhook] psicometricas unauthorized: bad secret"` con `requestId`.
       - En caso de error: `"[Webhook] psicometricas failed"` con `requestId` y mensaje de error.
     - Log de arranque de servidor ahora es estructurado (`server_started`) e incluye puerto y URL local.

3. **Contexto tRPC con requestId**
   - `server/_core/context.ts`:
     - `TrpcContext` ahora incluye `requestId` además de `user`.
     - `createContext`:
       - Obtiene `requestId` desde `req.requestId` o `x-request-id`; si no hay, genera uno con `logger.ensureRequestId`.
       - Pasa `requestId` en el objeto de contexto devuelto.
     - Reemplazo de `console.warn` por `logger.warn` en:
       - Fallo de `Firebase verifyIdToken`.
       - Fallo al consultar `getUserByOpenId`.
       - Fallo en `upsertUser` (se cae a usuario efímero).
       - Fallo al validar token de cliente (`validateClientToken`).
     - Todos estos logs incluyen ahora `requestId` y mensaje de error para facilitar el seguimiento de peticiones.

4. **Build y despliegue**
   - Se ejecutó `pnpm run build` dentro de `integra-rh-manus` sin errores.
   - Posteriormente se reconstruyó la imagen y se redeployó en Cloud Run (rev `api-00016-x9j` → `api-00016-x9j` / `api-00016-*` según último despliegue), manteniendo la URL: `https://api-559788019343.us-central1.run.app`.

5. **Documentación y estado de proyecto**
   - `PROYECTO.md` actualizado: **PVM-OBS-01** pasa de `[ ]` a `[✓]`.
   - Se dejó anotado que la observabilidad base se cubre ahora con:
     - requestId por petición.
     - logs JSON estructurados consumibles por Cloud Logging.

## Notas y próximos pasos

- El siguiente paso natural es **PVM-OBS-02** (healthcheck + métricas básicas) y luego **PVM-SEC-01** (RBAC base admin/cliente).
- Para debug en producción, buscar en Cloud Logging por `textPayload` que contenga:
  - `"incoming_request"` para ver entradas a la API.
  - `"server_started"` para comprobar arranque.
  - Prefijo `"[Auth]"` o `"[Webhook]"` con su `requestId` para reconstruir incidentes puntuales.

