# CHECKPOINT: Asignación de Analista + Pre-registro + Procesos

**Fecha:** 2026-02-09
**IDs de Implementación:** IMPL-20260209-01 a IMPL-20260209-07
**Estado:** IMPLEMENTADO (Pendiente de Verificación QA)

## 1. Asignación de Analista Responsable (Analista Asignado)
**Archivos:** `drizzle/schema.ts`, `server/routers/candidates.ts`, `server/routers/processes.ts`, `client/src/pages/Candidatos.tsx`, `client/src/pages/CandidatoDetalle.tsx`
- Se agregó el campo `analistaAsignadoId` en la tabla `candidates`.
- UI: Selector de usuario en creación y edición de candidatos.
- UI: Columna "Analista" en tabla de candidatos.
- Backend: Al crear un proceso, hereda el analista asignado del candidato.

## 2. Formulario de Pre-registro (Candidatos)
**Archivos:** `client/src/pages/CandidatoSelfService.tsx`, `drizzle/schema.ts`
- **Sección 5 (Pareja):** Leyenda roja "(SOLO LLENAR SI ERES SOLTERO/SOLTERA)" agregada.
- **Sección 6 (Familia/Económica):**
    - Eliminada pregunta genérica "¿Tiene Hijos?".
    - Nuevos campos específicos: `historialburoCredito`, `sindicatoEmpresa`, `puestoSindicato`.
- **Sección 8 (Documentos):**
    - Agregado "Licencia de conducir" al selector de documentos.

## 3. Gestión de Procesos
**Archivos:** `server/routers/processes.ts`, `client/src/pages/ProcesoDetalle.tsx`
- **Cambio de Proceso:** Se permite editar el tipo de proceso (`procesoTipoId`) incluso después de creado.
- **Nuevos Estados:** Se agregaron `SIN_ENTREVISTAR` y `ENTREVISTADO` al enum de estatus.

## 4. Mejoras Generales
**Archivos:** `server/routers/workHistory.ts`, `client/src/pages/CandidatoDetalle.tsx`
- **Auditoría:** El registro de cambios (`changedBy`) ahora guarda el nombre real del usuario logueado en lugar de "unknown" o ID genérico.
- **Investigación Laboral:** Invertido el orden de campos para el período laborado (UI).

## Notas Técnicas
- **Schema Changes:** Requiere migración o push de schema Drizzle (`pnpm db:push` o similar) para `analistaAsignadoId` y nuevos campos JSON.
- **Validación Pendiente:** Verificar flujo de herencia de analista y visualización de nuevos campos en el PDF final si aplica.
