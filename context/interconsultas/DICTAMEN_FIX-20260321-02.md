# DICTAMEN TÉCNICO: Plan correctivo mínimo para llevar Armados a GO con release candidate limpio
- **ID:** FIX-20260321-02
- **Fecha:** 2026-03-21
- **Solicitante:** INTEGRA
- **Estado:** ✅ VALIDADO

### A. Análisis de Causa Raíz
El no-go vigente no responde a una sola falla funcional de Armados, sino a mezcla de scope en el worktree. El lote actual combina un núcleo promovible de Armados/publicación con archivos sensibles, artefactos locales, documentación operativa, cambios UI no relacionados y una variante HTML-first cuyo comportamiento en producción no coincide todavía de forma determinista con el entorno local.

Hallazgos forenses que condicionan el GO:
1. `integra-rh-manus/firebase-admin-sdk.json` sigue versionado y modificado; eso bloquea cualquier promoción.
2. El RC no puede salir como “worktree completo”; debe nacer desde un subset mínimo de Armados ya validado en `CHK_2026-03-19_ARCH-20260319-01-ARMADOS.md`.
3. `processes.ts` es el punto de mayor riesgo residual porque concentra publicación, acceso, generación de draft y auditoría; si entra al RC, sus cambios deben quedar limitados al flujo Armados estable.
4. La variante HTML-first (`armadoPdfFromHtml.ts`) hoy depende de `@playwright/test` como devDependency; en producción degrada a fallback `pdf-lib` salvo preparación explícita de runtime.
5. El lote contiene varios archivos que no agregan valor al release candidate y solo amplían superficie de fallo: artefactos PDF, scratch scripts, checkpoints, specs y UI ajena.

### B. Justificación de la Solución
La solución mínima y ejecutable no es “arreglar todo”, sino recortar el release candidate al subconjunto de Armados/publicación que ya tiene validación funcional, dejar fuera la rama HTML-first y todos los residuos no promovibles, y exigir un gate objetivo de tipado/pruebas únicamente sobre ese subset. Eso reduce riesgo operativo, conserva el avance real y deja una ruta clara para que SOFIA alcance GO sin reabrir un lote grande.

### C. Instrucciones de Handoff para SOFIA
1. Construir un branch limpio con solo el subset de Armados/publicación ya validado; no partir del worktree completo.
2. Excluir del RC el secreto, artefactos locales, checkpoints, specs y cualquier cambio UI/infra no requerido por Armados publicado.
3. Mantener `processes.ts` solo con el flujo estable de versiones publicadas, acceso cliente y auditoría mínima de Armados; no meter HTML-first si el runtime productivo no está resuelto.
4. Tratar HTML-first como lote separado: o se empaqueta Playwright/Chromium en runtime o se saca del RC.
5. Declarar `pnpm check` y las pruebas focalizadas de Armados como gates obligatorios del RC, no opcionales.
6. Validar antes del GO que el cliente solo vea la última versión `published`, que no exista bypass por `archivoDictamenUrl` y que la numeración/versionado siga protegida por `snapshot` obligatorio + índice único.