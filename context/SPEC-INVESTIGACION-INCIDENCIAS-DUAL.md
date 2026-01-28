# SPEC: Incidencias duplicadas (Candidato vs Empresa)

**ID:** ARCH-20260128-20  
**Ruta:** context/SPEC-INVESTIGACION-INCIDENCIAS-DUAL.md  
**Fecha:** 2026-01-28  
**Alcance:** Investigación Laboral → Bloque 2 (Tiempo e incidencias)

---

## Objetivo
Separar la captura de incidencias en dos fuentes: **candidato** y **empresa**, para evitar pérdida de detalle y mejorar la trazabilidad.

## Cambios requeridos
1. **Incapacidades**
   - Campo para candidato.
   - Campo para empresa.

2. **Inasistencias / Faltas**
   - Campo para candidato.
   - Campo para empresa.

3. **Antecedentes legales (demandas, conflictos)**
   - Campo para candidato.
   - Campo para empresa.

## Datos
Se almacenan en `investigacionDetalle.incidencias` como:
- `incapacidadesCandidato`
- `incapacidadesEmpresa`
- `inasistenciasCandidato`
- `inasistenciasEmpresa`
- `antecedentesLegalesCandidato`
- `antecedentesLegalesEmpresa`

Compatibilidad: mantener lectura de campos legacy si existen (`incapacidadesJefe`, `inasistencias`, `antecedentesLegales`) para no perder información histórica.

## Archivos
- integra-rh-manus/client/src/pages/CandidatoDetalle.tsx
- integra-rh-manus/server/routers/workHistory.ts
