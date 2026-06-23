# Checkpoint: Cierre del micro-sprint FIX-ARMADOS-COVERAGE-01

**ID:** FIX-20260622-01
**Fecha:** 2026-06-22
**Agente implementador:** SOFIA
**Segunda mano:** GEMINI (auditoría manual complementaria por INTEGRA ante reporte truncado)
**SPEC:** `context/SPECs/SPEC-FIX-20260622-01-cobertura-armados.md`
**Auditoría origen:** `ARCH-20260622-02`

---

## Resultado

**✓ COMPLETADO** — Cobertura del renderer de Armados ampliada de ~75% a ~95% del SPEC rector.

---

## Brechas Cerradas

| Sección | Antes | Después |
|---|---|---|
| 1. generales_candidato | 11/14 (79%) | 14/14 (100%) |
| 3. investigacion_laboral | 7/11 (64%) | 11/11 (100%) |
| 5. semanas_cotizadas | 4/5 (80%) | 5/5 (100%) |
| 9. observaciones_conclusion | 2/7 (29%) | 7/7 (100%) |

**Cobertura global del SPEC:** ~75% → ~95%

---

## Archivos Modificados

| Archivo | Cambios | Líneas |
|---|---|---|
| `integra-rh-manus/server/utils/armadoHtmlRenderer.ts` | 4 builders ampliados (T1-T4) | +103 netas |
| `integra-rh-manus/client/src/pages/ProcesoDetalle.tsx` | Sanitización `vd._*` + `siteName` en snapshot (T5) | ~10 |
| `integra-rh-manus/server/utils/armadoHtmlRenderer.test.ts` | **Nuevo** — 12 tests unitarios (T6) | +244 |
| `context/decisions/ADR-FIX-20260622-01-particion-secciones-7-8.md` | **Nuevo** — ADR documenta partición 7 vs 8 (T7) | +51 |
| `context/SPECs/SPEC-FIX-20260622-01-cobertura-armados.md` | **Nuevo** — SPEC del micro-sprint | — |

---

## Criterios de Aceptación — Estado Final

| # | Criterio | Estado |
|---|----------|--------|
| CA-1 | Sección 9 imprime `calificacionFinal` con banner + `comentarioCalificacion` + `fechaCierre` | ✓ |
| CA-2 | Sección 1 imprime `situacionFamiliar` y `financieroAntecedentes` | ✓ |
| CA-3 | Sección 1 imprime `siteName` (plaza/CEDI) | ✓ |
| CA-4 | Sección 3 imprime tiempo trabajado + contacto + desempeño por empleo | ✓ |
| CA-5 | Sección 5 imprime número de semanas cotizadas | ✓ |
| CA-6 | Snapshot filtra claves `vd._*` antes de serializar | ✓ |
| CA-7 | 12 tests nuevos pasan | ✓ (54/54 total) |
| CA-8 | `pnpm build` y typecheck sin errores nuevos | ✓ |
| CA-9 | No regresiones en suite existente (24/24 PDF tests) | ✓ |
| CA-10 | Checkpoint de cierre generado y `PROYECTO.md` actualizado | ✓ |

---

## Soft Gates

- [✓] **Gate 1 — Compilación:** `pnpm build` OK, `dist/index.js 412.4kb`. 1 error TS preexistente no relacionado (JSX namespace en `armadoPdfFromHtml.test.ts:38`).
- [✓] **Gate 2 — Testing:** 54/54 tests pasan (24 existentes PDF + 12 nuevos renderer + 18 otros).
- [△] **Gate 3 — Revisión:** GEMINI delegado pero reporte llegó truncado; INTEGRA ejecutó auditoría manual sobre los 4 builders + sanitización + ADR + tests. Diff verificado manualmente — alcance 4 archivos + 1 ADR, sin cambios colaterales.
- [✓] **Gate 4 — Documentación:** Este checkpoint + comentarios `@intervention FIX-20260622-01` en código + ADR.

---

## Decisiones Técnicas

1. **`buildArmadoSnapshot()` cambia de arrow expression a block body** para permitir sanitización de `visitaDetalle` antes de serializar. Caller (`handleGenerateLegacyDraft`) sigue funcionando — espera objeto y recibe objeto.
2. **`buildGeneralesCandidato` cambia de `return \`...\`` a `let body = ""; ... return body`** para permitir bloques condicionales nuevos. Resto de builders no se tocaron en su estructura.
3. **Cascada en `buildSemanasWotizadas`:** `process.semanasDetalle.semanasCotizadas ?? candidate.dictamenLaboral.semanasCotizadas ?? null`. Solo se imprime si hay valor no-vacío.
4. **Defensa en profundidad contra `vd._*`:** filtro explícito en cliente (`buildArmadoSnapshot`) + verificación cero referencias en renderer (`grep vd\._` retorna vacío).
5. **Tests robustos:** 3 por builder (presente / ausente / cascada cuando aplica). El test "omite el bloque si no hay dato en ninguna fuente" usa `not.toContain` para verificar el negativo.

---

## Riesgos Residuales

| Riesgo | Severidad | Mitigación |
|--------|-----------|------------|
| Datos de contacto de referencia (PII) impresos sin restricción | Baja | Ya están en `workHistory[]` y se consultan en otras vistas (ej. portal cliente). Sin cambio de política. |
| `siteName` puede venir sin resolver para procesos sin plaza | Baja | `field()` omite si null. Test cubre caso. |
| GEMINI no pudo completar reporte | Baja | INTEGRA ejecutó auditoría manual sobre los 4 builders + sanitización + tests + ADR y confirmó cumplimiento de CA-1 a CA-10. |
| Partición 7 vs 8 sigue documentada como "Pendiente de revisión con negocio" en ADR | Baja | No es bloqueante. Conversación futura. |

---

## Próximos Pasos

1. **QA visual Frank:** generar borrador nuevo en proceso 82, abrir Vista Previa HTML, verificar las 4 brechas cerradas.
2. **Pendiente para micro-sprint futuro:** paginación "Página X de Y" en PDF, banner UI de fallback pdf-lib, lifecycle de archivos en Storage.
3. **Conversación con negocio:** confirmar si la nomenclatura "Visita domiciliaria" vs "Formulario del encuestador" causa confusión en cliente final (ver ADR).

---

## Trazabilidad

- SPEC rector: `context/SPECs/SPEC-pdf-dinamico-estudio-cliente.md` (ARCH-20260320-25)
- SPEC editorial: `context/SPECs/SPEC-armados-editorial-proceso-82.md` (ARCH-20260408-06)
- SPEC del fix: `context/SPECs/SPEC-FIX-20260622-01-cobertura-armados.md`
- Auditoría origen: revisión INTEGRA 2026-06-22 (referencia `ARCH-20260622-02`)
- ADR complementario: `context/decisions/ADR-FIX-20260622-01-particion-secciones-7-8.md`