# Checkpoint: UX Historial Laboral - Fechas Flexibles

**Fecha:** 2025-12-18 22:15
**Responsable:** SOFIA (Builder)
**Estado:** Completado

## Resumen
Se modificó la captura de fechas en el historial laboral del formulario de candidatos (Self-Service) para permitir un formato más flexible tipo LinkedIn: "Mes (opcional) + Año".

## Cambios Realizados

### Frontend (`client/src/pages/CandidatoSelfService.tsx`)
- **Nuevo Componente `MonthYearInput`:**
  - Implementado localmente en el archivo.
  - Renderiza dos selectores: Mes (opcional) y Año (obligatorio).
  - Maneja formatos `YYYY`, `YYYY-MM` y `YYYY-MM-DD` (retrocompatibilidad visual).
- **Reemplazo de Inputs:**
  - Se sustituyeron los `<Input type="date" />` por `<MonthYearInput />` en los campos `fechaInicio` y `fechaFin` del historial laboral.
  - Esto elimina la obligatoriedad de seleccionar un día específico, reduciendo la fricción para el candidato.

## Verificación
- **Compilación:** `npm run build` exitoso.
- **Datos:** El formato guardado en BD será `YYYY` o `YYYY-MM`, compatible con la columna `varchar(50)` existente en `workHistory`.

## Siguientes Pasos
- Desplegar cambios a producción (Cloud Run + Firebase Hosting).
