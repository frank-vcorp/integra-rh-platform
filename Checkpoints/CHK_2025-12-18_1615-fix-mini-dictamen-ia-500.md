# Checkpoint: Fix 500 Mini Dictamen IA (WorkHistory) + Logging tRPC

**Fecha:** 18 de diciembre de 2025
**Estado:** Código corregido y desplegado.

## 1. Síntoma

En `CandidatoDetalle` (Historial Laboral), al presionar el botón de *Mini dictamen IA* (icono ✨), el cliente reportaba:

- `workHistory.generateIaDictamen` con **HTTP 500**
- Error en UI: **"Unable to transform response from server"**

Request correlacionado:
- `x-request-id`: `73915836-7a38-4c59-a7af-a9e861856b1f`
- URL: `POST /api/trpc/workHistory.generateIaDictamen?batch=1`

## 2. Causa probable

El 500 se estaba devolviendo sin logs útiles y en algunos casos terminaba como respuesta no transformable por el cliente.

## 3. Cambios aplicados

### Backend

- `integra-rh-manus/server/_core/index.ts`
  - Se añadió `onError` a `createExpressMiddleware` para loguear errores tRPC con:
    - `requestId`
    - `path`, `type`
    - `code`, `message`

- `integra-rh-manus/server/routers/workHistory.ts`
  - Se endureció `maybeGenerateIaDictamen` para que **no propague throws** desde llamadas DB previas al `try/catch`.
  - Se envolvió `generateIaDictamen` en `try/catch` y se garantiza:
    - logging con `requestId`
    - respuesta como `TRPCError` controlado ante errores inesperados

## 4. Despliegue

- Cloud Run `api` desplegado:
  - Revisión: `api-00048-r76`
  - URL: `https://api-559788019343.us-central1.run.app`

### Corrección operativa (config)

- Se creó el secreto `BUILT_IN_FORGE_API_KEY` en Secret Manager y se vinculó a Cloud Run.
- Se detectó que una actualización de servicio dejó fuera `DATABASE_URL`/`SENDGRID_API_KEY`; se restauraron ambos secrets y se mantuvo `BUILT_IN_FORGE_API_KEY`.
- Revisión actual con secrets restaurados: `api-00050-6vf`.

## 5. Verificación

- Compilación/validación: archivos modificados sin errores de TypeScript.
- Pruebas: no hay suites de test en `server/**` (vitest reportó `No test files found`).
- UI: el botón de mini dictamen ya responde con precondiciones (p.ej. pedir marcar como “Terminada”) en lugar de 500 no transformable.

## 6. Próximos pasos

- Reintentar generar el mini dictamen IA desde la UI.
- Si vuelve a fallar, ahora el log `trpc_error` debe aparecer en Cloud Run con el `requestId` para ver causa raíz (DB/LLM/etc.).

### Nota operativa

- Si el error es `FAILED_PRECONDITION` con mensaje "La API de IA no está configurada (falta API key)", falta configurar el secreto/variable `BUILT_IN_FORGE_API_KEY` en Cloud Run.
