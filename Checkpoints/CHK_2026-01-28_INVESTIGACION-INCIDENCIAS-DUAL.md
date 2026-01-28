# Checkpoint: Incidencias duplicadas (candidato/empresa)

**Fecha:** 2026-01-28  
**Agente:** INTEGRA - Arquitecto  
**Tipo:** Ajuste de formulario / investigación laboral  
**Estado:** ✅ Completado

---

## Resumen Ejecutivo
Se duplicaron campos de incidencias para capturar por separado la información proporcionada por el candidato y la empresa (incapacidades, inasistencias/faltas y antecedentes legales), manteniendo compatibilidad con datos legacy.

## Cambios Realizados

### 1) UI – Investigación Laboral (Bloque 2)
**Ubicación:** `/integra-rh-manus/client/src/pages/CandidatoDetalle.tsx`
- Incapacidades: candidato y empresa.
- Inasistencias/Faltas: candidato y empresa.
- Antecedentes legales: candidato y empresa.
- Se mantienen valores legacy como fallback en la vista.

### 2) Backend – Schemas y prompt de mini‑dictamen
**Ubicación:** `/integra-rh-manus/server/routers/workHistory.ts`
- Schema de `incidencias` ampliado con campos duplicados.
- Prompt de IA actualizado para incluir los nuevos campos con fallback legacy.

## Especificación
- SPEC: `context/SPEC-INVESTIGACION-INCIDENCIAS-DUAL.md`

## Archivos Modificados
- `integra-rh-manus/client/src/pages/CandidatoDetalle.tsx`
- `integra-rh-manus/server/routers/workHistory.ts`
- `context/SPEC-INVESTIGACION-INCIDENCIAS-DUAL.md`
- `PROYECTO.md`

## Verificación
- [ ] Abrir Investigación Laboral → Bloque 2: validar 2 campos por concepto.
- [ ] Guardar investigación y verificar persistencia.
- [ ] Verificar mini‑dictamen con campos nuevos.

---

## Notas
Compatibilidad preservada para registros existentes con campos legacy.
