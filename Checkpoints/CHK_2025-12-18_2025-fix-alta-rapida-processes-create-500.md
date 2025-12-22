# Checkpoint — Fix Alta Rápida: `processes.create` 500 por colisión de `clave`

**Fecha:** 2025-12-18
**Responsable:** SOFIA

## Síntoma
- Al crear un proceso desde **Alta Rápida** (flujo cliente→candidato→puesto→proceso), el backend respondía **500** en `POST /api/trpc/processes.create`.
- En consola se observaba el `INSERT INTO processes ...` con `clave` tipo `ESE-2025-001` y `tipoProducto` `ESE FORANEO`.

## Causa raíz (probable)
- La generación de `clave` usa un **prefijo** derivado (`ESE`, `ILA`, `VISITA`, etc.).
- El cálculo de `consecutivo` se hacía por `tipoProducto` completo (p.ej. `ESE LOCAL` vs `ESE FORANEO`).
- Resultado: dos variantes diferentes podían intentar crear la **misma clave** (ej. `ESE-2025-001`), provocando error de DB por unicidad.

## Fix
- `integra-rh-manus/server/db.ts`
  - Nuevo helper: `getNextConsecutiveByClavePrefix(prefix, year)`.
- `integra-rh-manus/server/routers/processes.ts`
  - `processes.create` ahora calcula `consecutivo` por **prefijo/año** (consistente con la `clave`).

## Build
- `pnpm -s run build` en `integra-rh-manus`: OK.

## Deploy (Producción)
- Cloud Run service: `api` (project `integra-rh`, region `us-central1`).
- Comando:
  - `gcloud run deploy api --source . --region=us-central1 --project=integra-rh --platform=managed --quiet`
- Resultado:
  - Revisión: `api-00052-gbf` (100% tráfico).
  - URL: `https://api-559788019343.us-central1.run.app`

## Validación pendiente
- Reintentar Alta Rápida creando `ESE FORANEO` / `ESE LOCAL` y confirmar que ya no devuelve 500.
- Si vuelve a fallar, capturar `x-request-id` del response y revisar logs de Cloud Run.
