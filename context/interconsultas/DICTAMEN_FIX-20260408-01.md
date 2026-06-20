# DICTAMEN TÉCNICO: 501 en getReportVersionHtml desde hostname público legacy
- **ID:** FIX-20260408-01
- **Fecha:** 2026-04-08
- **Solicitante:** SOFIA
- **Estado:** ✅ VALIDADO

### A. Análisis de Causa Raíz
El síntoma en producción (`POST /api/trpc/processes.getReportVersionHtml?batch=1` → `501 Not Implemented` con mensaje `Preview HTML no disponible en esta versión.`) **no proviene de una revisión vieja sirviendo tráfico**. La evidencia muestra que las solicitudes fallidas llegan a la revisión activa `api-00276-9pz`, con 100% del tráfico del servicio `api`.

Hallazgos forenses validados:

1. **El hostname público legado sigue siendo usado por el frontend compilado.**
   - En `integra-rh-manus/.env.production` está fijado `VITE_API_URL=https://api-559788019343.us-central1.run.app/api/trpc`.
   - Esto hace que Hosting no use el rewrite relativo `/api/**` hacia Cloud Run, sino que el navegador llame directo al hostname `api-559788019343...`.

2. **Ese hostname legado no está apuntando a una revisión previa.**
   - Logs de Cloud Run muestran `POST 501` sobre `https://api-559788019343.us-central1.run.app/api/trpc/processes.getReportVersionHtml?batch=1` atendidos por `resource.labels.revision_name="api-00276-9pz"`.
   - La URL canónica del servicio `api` también resuelve a `api-00276-9pz` con 100% de tráfico (`status.url=https://api-lvqym3bv3a-uc.a.run.app`).

3. **La revisión activa fue construida desde un commit que todavía no contiene el hotfix.**
   - Los logs de request etiquetan la revisión `api-00276-9pz` con `commit-sha=6e7f287d95becbd36c5b208c838c8bf4051f98d8` y `gcb-build-id=98d10c68-5ad4-4624-aab9-f30937181060`.
   - El workspace local actual también está en `HEAD=6e7f287d95becbd36c5b208c838c8bf4051f98d8`, pero con **cambios sin commit** en `integra-rh-manus/server/routers/processes.ts` y archivos relacionados.
   - El diff local de `integra-rh-manus/server/routers/processes.ts` muestra exactamente el reemplazo del bloque que en `HEAD` termina en `NOT_IMPLEMENTED` por la nueva lógica `htmlStoragePath || regeneración on-demand`.

4. **Existe un servicio legado separado (`integra-rh-backend`), pero no es la causa del 501 observado.**
   - Ese servicio está roto desde febrero (`HealthCheckContainerError`) y sin URL activa.
   - El hostname que falla en producción está entrando al servicio `api`, no a `integra-rh-backend`.

Conclusión de causa raíz:

**La causa raíz más probable es desalineación entre código local y artefacto desplegado**: el hotfix de `getReportVersionHtml` vive solo en el working tree local y **no fue incluido en el commit/build que generó la revisión `api-00276-9pz`**. El uso de `VITE_API_URL` absoluto hacia `api-559...` agrava el diagnóstico porque hace parecer que Hosting apunta a otro backend, pero la falla real sigue estando en el artefacto actualmente desplegado del servicio `api`.

### B. Justificación de la Solución
La corrección debe atacar dos capas:

1. **Desplegar el código correcto**
   - Commit/push de los cambios locales que ya reemplazan `NOT_IMPLEMENTED` por lectura desde `htmlStoragePath` y regeneración on-demand.
   - Verificar que el nuevo build de Cloud Build etiquete una revisión posterior a `api-00276-9pz` con un `commit-sha` distinto de `6e7f287...`.
   - Confirmar en logs que `POST /processes.getReportVersionHtml` deja de devolver `501` y retorna `200` para un `versionId` válido autenticado.

2. **Eliminar el bypass del rewrite de Hosting**
   - Cambiar `VITE_API_URL` de producción a `/api/trpc` o retirar el valor absoluto para que el frontend use el rewrite configurado en `firebase.json`.
   - Esto evita futuras confusiones entre hostnames legacy y la URL canónica de Cloud Run, y garantiza que web y API viajen juntos en la misma superficie pública.

Esta recomendación es la menos invasiva y explica simultáneamente:
- por qué el navegador llama a `api-559...`;
- por qué el 501 persiste pese a existir el fix en el workspace;
- y por qué la revisión actual sigue mostrando el comportamiento antiguo.

### C. Instrucciones de Handoff para SOFIA
1. Confirmar el diff pendiente en `integra-rh-manus/server/routers/processes.ts`, `integra-rh-manus/server/utils/armadoHtmlRenderer.ts`, `integra-rh-manus/server/utils/estudiosocioPdf.ts`, `integra-rh-manus/drizzle/0026_armado_html_storage_path.sql` y archivos asociados del hotfix.
2. Crear un commit en español que incluya explícitamente `FIX-20260408-01` o el ID de implementación correspondiente.
3. Desplegar de nuevo y validar que la nueva revisión ya no tenga la etiqueta `commit-sha=6e7f287d95becbd36c5b208c838c8bf4051f98d8`.
4. Ajustar `integra-rh-manus/.env.production` para usar `/api/trpc` y volver a desplegar Hosting para que el frontend deje de llamar a `api-559...` directamente.
5. Verificar con una sesión autenticada de admin:
   - `POST /api/trpc/processes.getReportVersionHtml?batch=1` retorna `200`.
   - El payload responde con `source: "storage"` o `source: "regenerated"`.
   - Logs de Cloud Run ya no registran `501` para ese path.

### D. Evidencia Concreta
- `gcloud run services describe api` → `latestReadyRevisionName: api-00276-9pz`, `traffic: 100%`.
- `gcloud logging read ... requestUrl:"api-559788019343.us-central1.run.app/api/trpc/processes.getReportVersionHtml"` → `POST 501` atendidos por `api-00276-9pz`.
- `gcloud logging read ...` de esos mismos requests → etiquetas `commit-sha=6e7f287d95becbd36c5b208c838c8bf4051f98d8` y `gcb-build-id=98d10c68-5ad4-4624-aab9-f30937181060`.
- `git rev-parse HEAD` local → `6e7f287d95becbd36c5b208c838c8bf4051f98d8` con cambios sin commit.
- `git diff -- integra-rh-manus/server/routers/processes.ts` → reemplazo explícito del bloque `NOT_IMPLEMENTED` por la ruta `htmlStoragePath` + regeneración.
- `integra-rh-manus/.env.production` → `VITE_API_URL=https://api-559788019343.us-central1.run.app/api/trpc`.