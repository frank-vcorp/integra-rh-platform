# DICTAMEN TÉCNICO: Aptitud del worktree actual para push a producción
- **ID:** FIX-20260321-01
- **Fecha:** 2026-03-21
- **Solicitante:** INTEGRA
- **Estado:** ✅ VALIDADO

### A. Análisis de Causa Raíz
El estado actual no es apto para push directo a producción como un lote único. El worktree mezcla cambios funcionales de Armados, endurecimiento de Storage, migraciones, ajustes UI ajenos, artefactos de documentación y al menos un secreto rotado de Firebase Admin. La causa raíz no es un único bug sino la ausencia de una frontera limpia entre cambios promovibles y cambios sensibles/no versionables.

Hallazgos forenses principales:
1. Existe una credencial privada activa versionada y modificada en `integra-rh-manus/firebase-admin-sdk.json`, lo que constituye un bloqueo absoluto de seguridad.
2. `pnpm check` falla con 121 errores en 28 archivos; varios errores están dentro de archivos tocados por este lote (`processes.ts`, `psicometricas.ts`, `VisitCapturePanel.tsx`, `AuditTrailViewer.tsx`).
3. El build productivo sí pasa, por lo que el pipeline puede desplegar un estado no tipado si no se ejecuta `check` como gate previo.
4. El renderer HTML-first depende de `@playwright/test` como dependencia de desarrollo, pero el runtime productivo instala solo dependencias de producción; en Cloud Run el camino HTML-first caerá sistemáticamente al fallback `pdf-lib`.
5. El lote contiene archivos operativos y de soporte no promovibles como `.vscode/tasks.json`, artefactos PDF de prueba y scripts scratch (`test-date.js`).
6. La segunda opinión de Qodo no pudo emitirse por límite de cuota agotado del entorno.

### B. Justificación de la Solución
La recomendación correcta no es “empujar menos” sino separar un subset promovible y bloquear explícitamente secretos, scratch files y documentación temporal. El sistema puede construir y desplegar, pero hacerlo con el worktree actual aumentaría el riesgo de fuga de credenciales, promoción de artefactos irrelevantes y publicación de un lote cuya semántica real en producción no coincide completamente con la esperada localmente.

### C. Instrucciones de Handoff para INTEGRA
1. Tratar `integra-rh-manus/firebase-admin-sdk.json` como incidente de seguridad: remover del lote y rotar/invalidar la llave si no se ha hecho fuera del repo.
2. No promover el worktree completo. Crear un changeset limpio con solo los archivos funcionales de Armados/Storage realmente aprobados.
3. Antes del push productivo, decidir si `pnpm check` será gate obligatorio o si se acepta conscientemente un deploy con deuda TypeScript existente.
4. Si el objetivo del release incluye HTML-first en producción, mover Playwright a dependencias de runtime o empaquetar Chromium en la imagen final; de lo contrario documentar explícitamente que producción usa fallback `pdf-lib`.
5. Excluir del lote `.vscode/tasks.json`, `context/armado/armado-draft-1774068257354.pdf`, `test-date.js` y `integra-rh-manus/test-date.js`.
6. Promover primero un subset mínimo: schema/migraciones/routers/utils/tests/UI de Armados, sin secretos ni artefactos locales.