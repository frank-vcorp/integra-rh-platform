# ADR-20260622-01: Partición editorial entre Sección 7 y Sección 8

**ID:** ADR-FIX-20260622-01-particion-secciones-7-8
**Fecha:** 2026-06-22
**Estado:** Vigente
**Autor:** INTEGRA
**Respaldo técnico:** `context/SPECs/SPEC-FIX-20260622-01-cobertura-armados.md` §4.4
**Decisión original:** `IMPL-20260408-01`

---

## Contexto

El SPEC rector (`SPEC-pdf-dinamico-estudio-cliente.md`) agrupa bajo la etiqueta
"Visita domiciliaria" contenidos que el renderer actual delega a "Formulario
del encuestador" (sección 8 del armado editorial). La consecuencia operativa
es: si la analista selecciona la sección 7 sin la sección 8, la visita
domiciliaria aparece resumida y el cliente puede interpretar que el armado
está incompleto, aunque la sección canónica (8) sí contenga el formulario
completo del encuestador.

## Decisión

Mantener la partición vigente desde `IMPL-20260408-01`:

- **Sección 7 (`visita_domiciliaria`)** — resumen ejecutivo de la visita
  (ubicación, hallazgos clave, evidencia destacada).
- **Sección 8 (`captura_visita`)** — formulario completo del encuestador
  (campos operativos, fotos de documentos, checklist presencial).

Esta ADR **solo documenta** la decisión editorial vigente. No modifica
comportamiento del renderer.

## Consecuencias

- ✅ Aceptable: el cliente recibe vista resumida cuando la analista decide
  seleccionar solo la sección 7. La fuente canónica de datos permanece en la
  sección 8.
- ✅ Aceptable: la sección 8 sigue siendo el contenedor completo y trazable
  de la información capturada por el encuestador en campo.
- ⚠️ Pendiente de revisión con negocio: confirmar si la nomenclatura
  "Visita domiciliaria" vs "Formulario del encuestador" causa confusión en
  el cliente final. Si negocio confirma confusión, abrir conversación para
  renombrar o fusionar en micro-sprint futuro.

## Trazabilidad

- SPEC origen: `SPEC-pdf-dinamico-estudio-cliente.md` (ARCH-20260320-25)
- SPEC editorial: `SPEC-armados-editorial-proceso-82.md` (ARCH-20260408-06)
- Implementación: `IMPL-20260408-01`
- Micro-sprint de cobertura: `FIX-20260622-01` (FIX-ARMADOS-COVERAGE-01)