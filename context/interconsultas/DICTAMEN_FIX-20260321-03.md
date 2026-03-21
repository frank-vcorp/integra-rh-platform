# DICTAMEN TÉCNICO: Estado forense actual de la rama para decidir push completo
- **ID:** FIX-20260321-03
- **Fecha:** 2026-03-21
- **Solicitante:** INTEGRA
- **Estado:** ✅ VALIDADO

### A. Análisis de Causa Raíz
El bloqueo real para subir toda la rama hoy no es un fallo único de Armados. El problema es la combinación de tres factores: el worktree completo sigue mezclando cambios promovibles con artefactos/noise, el gate global de TypeScript está roto en 94 errores distribuidos en 25 archivos, y la verificación funcional sólida hoy existe solo sobre el subset focalizado de Armados, no sobre el lote entero.

Hallazgos forenses principales:

1. **La rama completa no está lista para push excelente porque `pnpm check` falla hoy.** La validación global en `integra-rh-manus` devuelve `94 errors in 25 files`. Los errores incluyen archivos tocados en este lote, no solo deuda histórica ajena: `client/src/components/AuditTrailViewer.tsx`, `client/src/components/VisitCapturePanel.tsx`, `client/src/pages/CandidatoDetalle.tsx`, `server/routers/documents.ts`, `server/routers/psicometricas.ts`, `server/routers/workHistory.ts` y otros. Mientras este gate siga rojo, no hay base seria para promover la rama completa como un solo bloque.

2. **El subset Armados sí está cerca de GO, pero el worktree completo no.** Las pruebas focalizadas de Armados pasan: `pnpm exec vitest run server/utils/estudiosocioPdf.test.ts server/routers/processes.armados-access.test.ts` retorna `4/4 tests passing`. Además, el build productivo `pnpm build` sí pasa. Esto confirma que el flujo estable de Armados/publicación está mucho más sano que el resto del lote.

3. **El RC estable de Armados sigue usando renderer legado, no HTML-first en runtime.** En `server/routers/processes.ts`, `createLegacyReportDraft` está fijado explícitamente a `pdf_lib_legacy` y comenta que el HTML-first experimental está excluido del RC estable. Los archivos `server/utils/armadoPdfFromHtml.ts` y su test existen, pero no están integrados al runtime actual. Eso no bloquea el RC estable; sí bloquea cualquier afirmación de que “toda la rama” ya deja HTML-first listo para producción.

4. **El lote actual sigue mezclado y no está listo como changeset único.** `git status --porcelain=v2` muestra prácticamente todos los cambios funcionales como unstaged y solo la eliminación de `integra-rh-manus/firebase-admin-sdk.json` como staged. Además siguen presentes archivos no promovibles o de ruido operacional: `.vscode/tasks.json`, checkpoints, specs, PDF de prueba y scripts scratch (`test-date.js`). La rama no tiene frontera limpia entre producto, documentación interna y residuos de sesión.

5. **La eliminación del secreto va en la dirección correcta, pero todavía pesa como hallazgo de release engineering.** `integra-rh-manus/firebase-admin-sdk.json` aparece como borrado staged y `integra-rh-manus/.gitignore` ya lo ignora. Eso resuelve el riesgo de seguir versionándolo, pero también confirma que la rama todavía está en proceso de saneamiento y no en estado final de promoción.

6. **No hay verificación real contra Firebase Storage hoy dentro del cierre completo de la rama.** El propio `PROYECTO.md` deja pendiente la validación contra bucket real por credenciales locales inválidas. El hardening de errores de Storage está implementado, pero la comprobación de “excelente y verificada” para toda la rama no puede declararse completa mientras el flujo real con credenciales vigentes no se valide al menos una vez en entorno controlado.

7. **Segunda opinión Qodo no disponible.** Se ejecutó `qodo self-review -y -q`, pero terminó con código `1` sin reporte útil. No cambia el dictamen principal, solo deja constancia de que no hubo validación complementaria automática.

### B. Justificación de la Solución
La conclusión correcta hoy es **no conviene subir toda la rama como un solo lote**. El argumento técnico es directo:

- El worktree completo falla el gate de TypeScript.
- El valor promovible ya comprobado está concentrado en Armados/publicación y algunos endurecimientos de Storage.
- El resto del lote amplía superficie de riesgo sin dar una garantía equivalente de calidad.

La solución mínima no es “arreglar todo el repo” antes de cualquier push, sino recortar un release candidate limpio con el subset realmente verificado y dejar fuera deuda general, residuos de sesión y experimentos no activados en runtime.

### C. Instrucciones de Handoff para INTEGRA
1. **No subir toda la rama hoy** como un bloque único.
2. Construir un changeset limpio para promoción con solo el subset Armados/publicación y el hardening estrictamente necesario de Storage.
3. Antes del push del RC, dejar `pnpm check` en verde al menos para los archivos que entran al lote; idealmente, volver verde el workspace completo si se quiere promover la rama entera sin reservas.
4. Sacar del lote `.vscode/tasks.json`, checkpoints, specs, `context/armado/armado-draft-1774068257354.pdf`, `test-date.js` e iguales artefactos de sesión.
5. Confirmar que `firebase-admin-sdk.json` queda fuera del repo y fuera del índice definitivamente, con credenciales resueltas solo por entorno.
6. Si se quiere vender HTML-first como parte del release, integrarlo de verdad al runtime y validar dependencias/Chromium; si no, declararlo explícitamente fuera del RC y mantener `pdf_lib_legacy` como camino oficial.
7. Ejecutar una validación final con Storage real o en entorno controlado antes del push “excelente”, porque hoy esa parte sigue pendiente según el estado operativo del proyecto.