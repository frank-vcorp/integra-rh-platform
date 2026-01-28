# SPEC: Bloque Semanas Cotizadas (Investigación Laboral)

**ID:** ARCH-20260128-23  
**Ruta:** context/SPEC-INVESTIGACION-SEMANAS-COTIZADAS.md  
**Fecha:** 2026-01-28  
**Alcance:** Investigación Laboral → Bloque 2 (Tiempo e incidencias)

---

## Objetivo
Agregar un bloque de captura de “Semanas Cotizadas” en el Bloque 2 de la investigación laboral.

## Campos
- **Semanas cotizadas** (texto libre)
- **Disposición de semanas cotizadas** (texto libre)
- **Motivo de disposición** (texto libre)

## Datos
Se almacenan dentro de `investigacionDetalle.periodo` como:
- `semanasCotizadas`
- `disposicionSemanasCotizadas`
- `motivoDisposicion`

## Archivos
- integra-rh-manus/client/src/pages/CandidatoDetalle.tsx
- integra-rh-manus/server/routers/workHistory.ts
