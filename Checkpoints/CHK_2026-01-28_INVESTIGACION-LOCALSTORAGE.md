# Checkpoint: Borrador local en Investigación Laboral

**Fecha:** 2026-01-28  
**Agente:** INTEGRA - Arquitecto  
**Tipo:** UX / Prevención de pérdida de datos  
**Estado:** ✅ Completado

---

## Resumen Ejecutivo
Se agregó persistencia local (localStorage) para el modal de Investigación Laboral, evitando pérdida de información al cambiar de pestaña o cerrar sin guardar. Se incluyó confirmación al cerrar cuando hay borrador pendiente.

## Cambios Realizados

### 1) Persistencia local del formulario (draft)
**Ubicación:** `/integra-rh-manus/client/src/pages/CandidatoDetalle.tsx`
- Se crea y mantiene un borrador por empleo (`workHistoryId`) y candidato en `localStorage`.
- Se restaura automáticamente al abrir el modal.
- Se ajusta el número de filas de periodos según el borrador.
- Se limpia el borrador al guardar exitosamente en backend.

### 2) Advertencia al cerrar con cambios sin guardar
- Si existe borrador, se solicita confirmación al cerrar el modal.

## Especificación
- SPEC creada: `context/SPEC-INVESTIGACION-LOCALSTORAGE.md`

## Clave de almacenamiento
```
investigationDraft:v1:{candidateId}:{workHistoryId}
```

## Archivos Modificados
- `integra-rh-manus/client/src/pages/CandidatoDetalle.tsx`
- `context/SPEC-INVESTIGACION-LOCALSTORAGE.md`

## Verificación
- [ ] Abrir Investigación Laboral, escribir campos y cerrar modal → se mantiene borrador.
- [ ] Reabrir modal → se restauran campos.
- [ ] Guardar investigación → se elimina borrador y no aparece warning.

---

## Notas
Esta mejora es local al navegador. Se sugiere autosave backend posterior para persistencia multi‑dispositivo.
