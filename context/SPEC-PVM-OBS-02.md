**ID:** `PVM-OBS-02`
**Título:** `Healthcheck y Métricas Básicas`

**Resumen:**
Proveer un healthcheck aplicacional y un set mínimo de métricas operativas para comprobar disponibilidad y dependencias (DB).

**Criterios de Aceptación (DoD):**
1. Healthcheck: tRPC `system.health` (ya existe en `_core`) y/o endpoint REST `/healthz` en PVM que devuelve `{ ok: true }`.
2. Chequeo de DB opcional con timeout: intenta `SELECT 1` y reporta `db: ok|fail`.
3. Métricas básicas JSON: `uptimeSec`, `version`, `env`, `timestamp`, `requestId`.
4. Código HTTP `200` si ok; `503` si falla dependencia crítica.
5. Documentar ruta y semántica en `DOCUMENTACION_TECNICA.md`.

**Fuera de Alcance:** Prometheus exporter; métricas de negocio avanzadas.

