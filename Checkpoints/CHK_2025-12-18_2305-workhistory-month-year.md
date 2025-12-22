# Checkpoint: WorkHistory Mes/Año (LinkedIn-style)

**Fecha:** 2025-12-18
**Responsable:** SOFIA (Builder)
**Estado:** Listo para deploy

## Objetivo
Reducir fricción y “datos falsos” en historial laboral eliminando la captura de día y permitiendo capturar **Mes/Año**, con **Mes opcional** (estilo LinkedIn).

## Implementación

### Frontend
- `integra-rh-manus/client/src/pages/CandidatoDetalle.tsx`
  - Modal interno de historial laboral: se reemplazó `type="date"` por selectores **Mes (opcional) + Año** para inicio y fin.
  - El submit ahora envía `YYYY` o `YYYY-MM` según se capture.
  - Visualización de fechas de workHistory ahora usa `formatearFecha` (Mes/Año) en lugar de `toLocaleDateString`.

- `integra-rh-manus/client/src/pages/ClienteCandidatoDetalle.tsx`
- `integra-rh-manus/client/src/pages/ClienteDashboard.tsx`
  - Visualización de workHistory: usa `formatearFecha` para mostrar Mes/Año.

- `integra-rh-manus/client/src/lib/dateUtils.ts`
  - `calcularTiempoTrabajado` y `formatearFecha` ahora soportan entradas `YYYY`, `YYYY-MM` y `YYYY-MM-DD`.

### Backend
- `integra-rh-manus/server/_core/workDate.ts`
  - Nuevo helper `normalizeWorkDateInput`:
    - `YYYY` -> `YYYY-01-01`
    - `YYYY-MM` -> `YYYY-MM-01`
    - `YYYY-MM-DD` se preserva

- `integra-rh-manus/server/routers/workHistory.ts`
  - Normalización aplicada en `create` y `update`.
  - Zod endurecido para aceptar solo `YYYY`, `YYYY-MM` o `YYYY-MM-DD`.

- `integra-rh-manus/server/routers/candidateSelf.ts`
  - Normalización aplicada en `autosave`.
  - Zod endurecido para el mismo formato.

## Verificación
- `npm run build` (en `integra-rh-manus`): OK
- `npm test`: el repo no tiene archivos de test detectados por Vitest (sale con code 1 por “No test files found”).

## Nota
La base de datos usa `varchar` para `fechaInicio/fechaFin`. Con esta implementación se guardan fechas estándar (primer día del mes o del año) para permitir cálculos consistentes.
