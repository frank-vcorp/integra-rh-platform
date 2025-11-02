**ID:** `PVM-OBS-01`
**Título:** `Logger Estructurado y requestId`

**Resumen:**
Añadir un logger estructurado al servidor API con generación y propagación de `requestId` por petición para facilitar trazabilidad.

**Criterios de Aceptación (DoD):**
1. Middleware Express que asigna `requestId` (uuid v4 o nanoid) y lo coloca en `req` y respuesta (cabecera `x-request-id`).
2. Logger (pino o equivalente) con nivel configurable (`LOG_LEVEL`) y formato JSON en producción.
3. Todas las entradas de log incluyen `requestId`, `method`, `path`, `status`, `durationMs`.
4. Errores del middleware tRPC registran stack + `requestId`.
5. Documentación breve en `DOCUMENTACION_TECNICA.md` sobre uso y niveles.

**Fuera de Alcance:** Integración con APM externo; redacción de dashboards.

