# Checkpoint: UX Self-Service - Guardado Manual

**Fecha:** 2025-12-18
**Responsable:** SOFIA (Builder)
**Estado:** Completado

## Resumen
Se implementó una mejora de UX en el formulario de "Pre-registro de Candidato" (Self-Service) agregando una barra superior fija (sticky header) que permite guardar el borrador manualmente y visualiza la hora del último guardado exitoso.

## Cambios Realizados

### Frontend (`client/src/pages/CandidatoSelfService.tsx`)
- **Sticky Header:** Se agregó una barra fija en la parte superior (`fixed top-0`) con:
  - Nombre del candidato.
  - Indicador de "Guardado: HH:mm".
  - Botón "Guardar borrador" con estado de carga (`isPending`).
- **Lógica de Guardado:**
  - Se refactorizó la creación del payload en `getDraftPayload` para reutilizarla.
  - Se implementó `handleManualSave` para el botón.
  - Se actualizó `autosaveMutation` para actualizar el estado `lastSavedAt` al completar exitosamente.
  - Se mantuvo el autosave automático con debounce (5s) usando la misma lógica centralizada.

## Verificación
- **Compilación:** `npm run build` exitoso.
- **Funcionalidad:** El botón invoca la mutación `autosave` y muestra feedback visual (toast + hora).

## Siguientes Pasos
- Desplegar a producción si se requiere disponibilidad inmediata.
