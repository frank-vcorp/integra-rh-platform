# Checkpoint: Semanas Cotizadas (Investigación Laboral)

**Fecha:** 2026-01-28  
**Agente:** INTEGRA - Arquitecto  
**Tipo:** Ajuste de formulario / investigación laboral  
**Estado:** ✅ Completado

---

## Resumen Ejecutivo
Se agregó el bloque “Semanas Cotizadas” en el Bloque 2 de Investigación Laboral con tres campos de texto libre y persistencia en backend.

## Cambios Realizados

### 1) UI – Investigación Laboral (Bloque 2)
**Ubicación:** `/integra-rh-manus/client/src/pages/CandidatoDetalle.tsx`
- Semanas cotizadas (texto libre)
- Disposición de semanas cotizadas (texto libre)
- Motivo de disposición (texto libre)

### 2) Backend – Schemas y prompt de mini‑dictamen
**Ubicación:** `/integra-rh-manus/server/routers/workHistory.ts`
- Schema de `periodo` ampliado con los nuevos campos.
- Prompt de IA actualizado para incluir semanas cotizadas.

## Especificación
- SPEC: `context/SPEC-INVESTIGACION-SEMANAS-COTIZADAS.md`

## Archivos Modificados
- `integra-rh-manus/client/src/pages/CandidatoDetalle.tsx`
- `integra-rh-manus/server/routers/workHistory.ts`
- `context/SPEC-INVESTIGACION-SEMANAS-COTIZADAS.md`

## Verificación
- [ ] Abrir Investigación Laboral → Bloque 2: validar bloque “Semanas Cotizadas”.
- [ ] Guardar investigación y verificar persistencia.
- [ ] Verificar mini‑dictamen con nuevos campos.

---

## Notas
Campos de texto libre por indicación del usuario.
