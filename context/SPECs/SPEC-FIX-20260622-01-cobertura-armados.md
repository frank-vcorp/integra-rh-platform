# SPEC: Cierre de Cobertura del Apartado "Armados"

**ID:** FIX-20260622-01
**Ruta:** `context/SPECs/SPEC-FIX-20260622-01-cobertura-armados.md`
**Fecha:** 2026-06-22
**Autor:** INTEGRA
**Estado:** `[~]` Planificado
**Referencia (SPEC rector):** `context/SPECs/SPEC-pdf-dinamico-estudio-cliente.md` (ARCH-20260320-25)
**Referencia (SPEC editorial):** `context/SPECs/SPEC-armados-editorial-proceso-82.md` (ARCH-20260408-06)
**Auditoría origen:** `ARCH-20260622-02` (revisión de Armados — 2026-06-22)

---

## 1. Resumen Ejecutivo

Cerrar las brechas de cobertura detectadas en la auditoría del apartado de Armados respecto al SPEC rector (`SPEC-pdf-dinamico-estudio-cliente.md`, secciones "Mapeo Interno de Secciones" y "Matriz de Cobertura Obligatoria"). El renderer editorial actual cumple **~75%** del SPEC. Las brechas críticas son:

- **🔴 Sección 9 (Observaciones y conclusión)** no imprime `calificacionFinal` ni `comentarioCalificacion` en el cuerpo, dejando la sección de cierre del documento potencialmente vacía para el cliente.
- **🟠 Sección 1 (Generales del candidato)** omite `situacionFamiliar` y `financieroAntecedentes` del `perfilDetalle`, y la plaza/CEDI del proceso.
- **🟠 Sección 3 (Investigación laboral)** omite `tiempoTrabajadoEmpresa`, datos de contacto de referencia y `desempeñoScore` del `workHistory`.
- **🟠 Sección 5 (Semanas cotizadas)** no imprime el número numérico de semanas si existe.
- **🟡 Riesgo de regresión:** los metadatos de sesión `vd._*` (`_privacyAcceptedAt`, `_sessionStartedAt`, etc.) no están filtrados explícitamente en el snapshot, solo excluidos de facto porque ningún builder los lee.

Esta SPEC define el alcance exacto para llegar a **~95% de cobertura** en un único micro-sprint de 2-4 horas, sin alterar la arquitectura HTML-first existente.

---

## 2. Contexto y Problema

### 2.1 Situación actual

El sistema de Armados funciona en producción:
- Snapshot editorial inmutable persiste en `processReportVersions`.
- HTML editorial generado por `armadoHtmlRenderer.ts` y PDF vía Playwright/Chromium (`armadoPdfFromHtml.ts`).
- Cliente solo ve versiones `published`.
- Sección 8 (Captura/Formulario del encuestador) es la más completa (16/16 subsistemas).
- Secciones 4 (Legal) y 6 (Buró) cumplen 100% del SPEC.

### 2.2 Brechas detectadas

La auditoría del 2026-06-22 (referencia `ARCH-20260622-02`) comparó campo por campo lo que el SPEC declara obligatorio contra lo que el renderer actual imprime:

| Sección | Cobertura visible | Brecha principal |
|---|---|---|
| 1. generales_candidato | 11/14 (79%) | `situacionFamiliar`, `financieroAntecedentes`, `siteName` |
| 3. investigacion_laboral | 7/11 (64%) | `tiempoTrabajadoEmpresa`, contacto referencia, `desempeñoScore` |
| 5. semanas_cotizadas | 4/5 (80%) | número de semanas cotizadas |
| 9. observaciones_conclusion | 2/7 (29%) | `calificacionFinal`, `comentarioCalificacion` |

### 2.3 Riesgo de regresión

El snapshot actual en `ProcesoDetalle.tsx:286` reenvía `process.visitaDetalle` completo. Si un builder futuro lee `vd._privacyAcceptedAt` o `vd._sessionStartGps`, se filtra metadato sensible. Defensa actual: implícita (ningún builder los lee). Defensa requerida: explícita (lista de claves excluidas en el builder).

---

## 3. Alcance

### 3.1 Dentro de alcance (IN)

- **T1 — Sección 9 (Observaciones y conclusión) completa:** imprimir `calificacionFinal`, `comentarioCalificacion`, fecha de cierre, `dictamenLaboral.completado/completadoAt`, y campo editorial libre "conclusión analista" si existe.
- **T2 — Sección 1 (Generales del candidato) ampliada:** imprimir `perfilDetalle.situacionFamiliar` y `perfilDetalle.financieroAntecedentes`; añadir `siteName` (plaza/CEDI) al snapshot del proceso.
- **T3 — Sección 3 (Investigación laboral) ampliada:** imprimir `tiempoTrabajadoEmpresa`, `contactoReferencia`, `telefonoReferencia`, `correoReferencia`, `desempeñoScore` por cada empleo.
- **T4 — Sección 5 (Semanas cotizadas) ampliada:** imprimir número de semanas cotizadas si el dato existe (de `process.semanasDetalle` o `candidate.dictamenLaboral`).
- **T5 — Defensa contra regresión de metadatos `vd._*`:** añadir filtro explícito en `buildArmadoSnapshot()` (cliente) que excluya claves que empiezan con `_` antes de serializar `visitaDetalle`. Mantener como cinturón + tirantes del SPEC §H.
- **T6 — Tests unitarios por builder:** añadir al menos 3 casos por cada uno de los 4 builders modificados (snapshot mínimo, snapshot con datos, snapshot con campos faltantes), en `integra-rh-manus/server/utils/armadoHtmlRenderer.test.ts` (archivo nuevo).

### 3.2 Fuera de alcance (OUT)

- Refactor del renderer (split por builder) — candidato a micro-sprint futuro, no se mezcla aquí.
- Paginación "Página X de Y" en PDF Chromium — candidato previo, no se mezcla.
- Banner UI de fallback pdf-lib — no se mezcla.
- Lifecycle de archivos en Storage — no se mezcla.
- Partición editorial entre sección 7 y 8 — solo se documenta en ADR, no se modifica el comportamiento actual (decisión editorial vigente desde IMPL-20260408-01; revisarla requerirá conversación con negocio).

---

## 4. Diseño Técnico

### 4.1 Cliente — `integra-rh-manus/client/src/pages/ProcesoDetalle.tsx`

#### 4.1.1 Modificar `buildArmadoSnapshot()` (L286-309)

```ts
const buildArmadoSnapshot = () => {
  // Defensa explícita contra metadatos de sesión vd._*
  const visitaDetalleSanitizado = (() => {
    const vd = (process as any)?.visitaDetalle || {};
    return Object.fromEntries(
      Object.entries(vd).filter(([k]) => !k.startsWith("_"))
    );
  })();

  return {
    generatedAt: new Date().toISOString(),
    selectedSections: selectedArmadosSections,
    candidate: candidateRecord || null,
    client: clientRecord || null,
    post: postRecord || null,
    process: {
      id: process?.id,
      clave: process?.clave,
      tipoProducto: process?.tipoProducto,
      estatusProceso: process?.estatusProceso,
      calificacionFinal: process?.calificacionFinal,
      comentarioCalificacion: (process as any)?.comentarioCalificacion || null,
      fechaCierre: process?.fechaCierre || null,
      siteName: (process as any)?.siteName || null,    // ← NUEVO
      investigacionLaboral: (process as any)?.investigacionLaboral || null,
      investigacionLegal: (process as any)?.investigacionLegal || null,
      semanasDetalle: (process as any)?.semanasDetalle || null,
      antecedentesPenales: (process as any)?.antecedentesPenales || null,
      buroCredito: (process as any)?.buroCredito || null,
      visitaDetalle: visitaDetalleSanitizado,            // ← SANITIZADO
      visitStatus: (process as any)?.visitStatus || null,
    },
    workHistory,
    documents,
  };
};
```

### 4.2 Servidor — `integra-rh-manus/server/utils/armadoHtmlRenderer.ts`

#### 4.2.1 `buildGeneralesCandidato()` (L300)

Añadir después del bloque de redes sociales, **antes** del cierre del `return`:

```ts
// Situación familiar base
const sitFam = perfil.situacionFamiliar || {};
if (Object.keys(sitFam).length > 0) {
  body += '<div class="subsection-title">Situación familiar</div>';
  body += field("Estado civil", sitFam.estadoCivil);
  body += field("Hijos", sitFam.hijos);
  body += field("Vive con", sitFam.viveCon);
  body += field("Personas a cargo", sitFam.personasACargo);
}

// Financiero / Antecedentes declarativos
const finAnt = perfil.financieroAntecedentes || {};
if (Object.keys(finAnt).length > 0) {
  body += '<div class="subsection-title">Antecedentes financieros declarativos</div>';
  body += field("Ingresos mensuales declarados", finAnt.ingresosMensuales);
  body += field("Deudas vigentes", finAnt.deudasVigentes);
  body += field("Tarjetas de crédito", finAnt.tarjetasCredito);
  body += field("Observaciones", finAnt.observaciones);
}

// Plaza / CEDI
const siteName = (snapshot.process || {}).siteName;
if (siteName) {
  body += field("Plaza / CEDI", siteName);
}
```

> **Nota:** El renderer debe tolerar `sitFam` o `finAnt` con cualquier subset de claves; los `field()` omitirán los nulos automáticamente.

#### 4.2.2 `buildInvestigacionLaboral()` (L371)

Ampliar el bloque de cada empleo (después de `work-item-header`):

```ts
// Tiempo trabajado
if (item.tiempoTrabajadoEmpresa || item.tiempoTrabajado) {
  body += `<div class="work-tiempo"><span class="work-tiempo-label">Tiempo trabajado:</span> ${esc(item.tiempoTrabajadoEmpresa || item.tiempoTrabajado)}</div>`;
}

// Datos de contacto de referencia
if (item.contactoReferencia || item.telefonoReferencia || item.correoReferencia) {
  body += `<div class="work-ref-contacto">`;
  if (item.contactoReferencia) body += `<span><strong>Contacto:</strong> ${esc(item.contactoReferencia)}</span>`;
  if (item.telefonoReferencia) body += `<span><strong>Tel:</strong> ${esc(item.telefonoReferencia)}</span>`;
  if (item.correoReferencia) body += `<span><strong>Correo:</strong> ${esc(item.correoReferencia)}</span>`;
  body += `</div>`;
}

// Desempeño score
if (item.desempenoScore !== undefined && item.desempenoScore !== null) {
  body += `<div class="work-desempeno"><span class="work-desempeno-label">Desempeño:</span> ${esc(String(item.desempenoScore))}/5</div>`;
}
```

#### 4.2.3 `buildSemanasWotizadas()` (L504)

Añadir después de `field("Comentario de cotejo", ...)`:

```ts
// Número de semanas cotizadas (si existe)
const semanasNum =
  (process.semanasDetalle as any)?.semanasCotizadas ??
  (candidate.dictamenLaboral as any)?.semanasCotizadas ??
  null;
if (semanasNum !== null && semanasNum !== undefined) {
  body += `<div class="info-banner"><strong>Semanas cotizadas:</strong> ${esc(String(semanasNum))}</div>`;
}
```

#### 4.2.4 `buildObservacionesConclusion()` (L1123)

Reescritura completa:

```ts
function buildObservacionesConclusion(snapshot: Record<string, any>): string {
  const process = snapshot.process || {};
  const candidate = snapshot.candidate || {};
  const dictamen = candidate.dictamenLaboral || {};
  const inv = process.investigacionLaboral || {};
  const iaDictamen = inv.iaDictamenCliente || {};
  const cal = process.calificacionFinal || null;
  const comentarioCal = process.comentarioCalificacion || null;
  const fechaCierre = process.fechaCierre || null;

  let body = "";

  // ── Dictamen final
  if (cal && cal !== "pendiente") {
    const calColors = calificacionColors(cal);
    const calLabel = CALIFICACION_LABELS[cal] || cal;
    body += `
    <div class="cal-banner" style="background:${calColors.bg};border-color:${calColors.border};border-left:6px solid ${calColors.accent}">
      <div class="cal-label">DICTAMEN FINAL</div>
      <div class="cal-value" style="color:${calColors.text}">${esc(calLabel)}</div>
      ${fechaCierre ? `<div class="cal-meta">Fecha de cierre: ${formatDate(fechaCierre)}</div>` : ""}
    </div>`;
  }

  // ── Comentario de calificación (de la analista)
  if (comentarioCal) {
    body += '<div class="subsection-title">Comentario de calificación</div>';
    body += `<div class="narrative-block">${esc(comentarioCal)}</div>`;
  }

  // ── Resumen ejecutivo IA
  if (iaDictamen.resumenEjecutivoCliente) {
    body += '<div class="subsection-title">Resumen ejecutivo del estudio</div>';
    body += `<div class="narrative-block">${esc(iaDictamen.resumenEjecutivoCliente)}</div>`;
  }

  // ── Recomendaciones IA
  const recomendaciones: string[] = Array.isArray(iaDictamen.recomendacionesCliente)
    ? iaDictamen.recomendacionesCliente
    : [];
  if (recomendaciones.length > 0) {
    body += '<div class="subsection-title">Recomendaciones</div>';
    body += '<ul class="recommendation-list">';
    for (const rec of recomendaciones) {
      body += `<li>${esc(rec)}</li>`;
    }
    body += "</ul>";
  }

  // ── Estado del dictamen laboral
  if (dictamen.completado) {
    body += '<div class="subsection-title">Estado del dictamen laboral</div>';
    body += field("Completado", dictamen.completadoAt ? formatDate(dictamen.completadoAt) : "Sí");
  }

  // ── Sin contenido
  if (!body.trim()) {
    if (cal === "pendiente" || !cal) {
      body = '<p class="empty-note">Calificación final pendiente de asignar.</p>';
    } else {
      body = '<p class="empty-note">Sin observaciones adicionales para esta versión.</p>';
    }
  }

  return body;
}
```

### 4.3 Tests — `integra-rh-manus/server/utils/armadoHtmlRenderer.test.ts` (nuevo)

Cubrir 4 builders modificados × 3 casos cada uno = **12 tests mínimos**:

```ts
import { renderArmadoHtml } from "./armadoHtmlRenderer";

describe("buildGeneralesCandidato — cobertura FIX-20260622-01", () => {
  it("incluye situacionFamiliar cuando está presente en perfilDetalle", ...);
  it("incluye financieroAntecedentes cuando está presente en perfilDetalle", ...);
  it("incluye siteName (plaza/CEDI) cuando process.siteName existe", ...);
});

describe("buildInvestigacionLaboral — cobertura FIX-20260622-01", () => {
  it("muestra tiempoTrabajadoEmpresa por cada empleo", ...);
  it("muestra contacto/teléfono/correo de referencia cuando existen", ...);
  it("muestra desempenoScore cuando existe", ...);
});

describe("buildSemanasCotizadas — cobertura FIX-20260622-01", () => {
  it("muestra el número de semanas cotizadas si está en semanasDetalle", ...);
  it("muestra el número si solo está en dictamenLaboral", ...);
  it("omite el bloque si no hay dato en ninguna fuente", ...);
});

describe("buildObservacionesConclusion — cobertura FIX-20260622-01", () => {
  it("muestra dictamen final con calificacionFinal + fechaCierre", ...);
  it("muestra comentarioCalificacion de la analista", ...);
  it("muestra estado de dictamen laboral cuando completado=true", ...);
});
```

> Cada test construye un snapshot mínimo y verifica que el HTML resultante contiene los marcadores esperados. No se valida estilo CSS (eso queda para el flujo visual QA de GEMINI).

### 4.4 ADR complementario

`context/decisions/ADR-FIX-20260622-01-particion-secciones-7-8.md`:

```md
# ADR-XXX: Partición editorial entre Sección 7 y Sección 8

## Contexto
El SPEC rector agrupa en "Visita domiciliaria" contenidos que el renderer actual
delega a "Formulario del encuestador" (sección 8). Riesgo: si la analista
selecciona 7 pero no 8, la visita domiciliaria sale incompleta.

## Decisión
Mantener la partición vigente desde IMPL-20260408-01 (sección 7 = resumen
ejecutivo, sección 8 = formulario completo). Documentar en UI que seleccionar
7 sin 8 = vista resumida.

## Consecuencias
- Aceptable: el cliente recibe vista resumida si la analista lo decide.
- Aceptable: la sección 8 sigue siendo la fuente canónica de datos.
- Pendiente: revisar con negocio si la nomenclatura causa confusión.
```

---

## 5. Criterios de Aceptación

| # | Criterio | Cómo verificar |
|---|---|---|
| CA-1 | Sección 9 imprime `calificacionFinal`, `comentarioCalificacion` y `fechaCierre` en el cuerpo cuando existen | Test + visual manual |
| CA-2 | Sección 1 imprime `situacionFamiliar` y `financieroAntecedentes` cuando existen en `perfilDetalle` | Test + visual manual |
| CA-3 | Sección 1 imprime `siteName` (plaza/CEDI) cuando existe en `process` | Test + visual manual |
| CA-4 | Sección 3 imprime `tiempoTrabajadoEmpresa`, datos de referencia y `desempeñoScore` por empleo | Test + visual manual |
| CA-5 | Sección 5 imprime el número de semanas cotizadas cuando existe | Test + visual manual |
| CA-6 | Snapshot del proceso excluye claves `vd._*` antes de serializar | Test unitario en `ProcesoDetalle` (helper de sanitización) |
| CA-7 | 12 tests nuevos pasan | `pnpm test` |
| CA-8 | `pnpm build` y `pnpm typecheck` sin errores | CI local |
| CA-9 | No se introducen regresiones en el resto de builders | Re-ejecutar suite existente (24/24 OK) |
| CA-10 | Checkpoint de cierre generado y `PROYECTO.md` actualizado con `FIX-ARMADOS-COVERAGE-01 [✓]` | Manual |

---

## 6. Riesgos y Mitigaciones

| Riesgo | Severidad | Mitigación |
|---|---|---|
| Cambio en `buildObservacionesConclusion` rompe layout de PDF publicado | Media | Tests + diff visual contra draft existente |
| `field()` agrega ruido visual si el subset de claves es muy parcial | Baja | `Object.keys(...).length > 0` antes de cada bloque nuevo |
| Snapshot sanitizado rompe algún builder que dependía de `vd._privacyAcceptedAt` | Baja | Grep previo confirma que **ningún** builder actual usa `vd._*` |
| `siteName` no disponible en todos los procesos (campo opcional) | Baja | `field()` omite si es null; test cubre el caso |
| Datos de contacto de referencia exponen PII sensible | Baja | SPEC §H.715-726 no excluye explícitamente; **datos ya están en `workHistory[]` y se consultan en otras vistas** (ej. portal cliente). Sin cambio de política. |

---

## 7. Plan de Implementación

### Micro-sprint FIX-ARMADOS-COVERAGE-01

**Fecha:** 2026-06-22  
**Duración estimada:** 2-4 horas  
**Agente implementador:** SOFIA  
**Segunda mano:** GEMINI

#### Entregable Demostrable

> Generar un borrador de armado de un proceso con datos reales (ej. proceso 82) y verificar visualmente en el preview HTML que:
> 1. La sección "Observaciones y conclusión" ya muestra el dictamen final con la calificación y el comentario de la analista.
> 2. La sección "Generales del candidato" muestra la situación familiar, antecedentes financieros y la plaza/CEDI.
> 3. La sección "Investigación laboral" muestra el tiempo trabajado y los datos de contacto de cada referencia.
> 4. La sección "Semanas cotizadas" muestra el número numérico de semanas.

#### Tareas Técnicas

- [ ] (2) T1: Ampliar `buildObservacionesConclusion` con dictamen final + comentario + fecha cierre + dictamen laboral
- [ ] (1) T2: Ampliar `buildGeneralesCandidato` con situacionFamiliar, financieroAntecedentes, siteName
- [ ] (1) T3: Ampliar `buildInvestigacionLaboral` con tiempoTrabajado, contacto, desempeño
- [ ] (1) T4: Ampliar `buildSemanasWotizadas` con número de semanas
- [ ] (1) T5: Sanitizar `visitaDetalle` en `buildArmadoSnapshot()` (cliente)
- [ ] (2) T6: Crear `armadoHtmlRenderer.test.ts` con 12 tests
- [ ] (1) T7: Crear `ADR-FIX-20260622-01-particion-secciones-7-8.md`
- [ ] (1) T8: Validación GEMINI con diff visual y revisión de código

#### Cómo Demostrar

1. Abrir proceso 82 (o cualquier proceso con datos completos) en el portal interno.
2. Ir a tab "Armados" → "Vista previa HTML" de la última versión draft.
3. Verificar las 4 brechas cerradas.
4. Ejecutar `pnpm --dir integra-rh-manus test` → 36/36 tests OK (24 existentes + 12 nuevos).
5. Ejecutar `pnpm --dir integra-rh-manus build` → sin errores.

---

## 8. Archivos Probablemente Afectados

- `integra-rh-manus/client/src/pages/ProcesoDetalle.tsx` — `buildArmadoSnapshot()`
- `integra-rh-manus/server/utils/armadoHtmlRenderer.ts` — 4 builders + helper sanitización (si se decide server-side)
- `integra-rh-manus/server/utils/armadoHtmlRenderer.test.ts` — **nuevo**
- `context/decisions/ADR-FIX-20260622-01-particion-secciones-7-8.md` — **nuevo**
- `PROYECTO.md` — marcar `FIX-ARMADOS-COVERAGE-01 [✓]` al cierre

---

## 9. NO Objetivos (Out of Scope Explícito)

- No se modifica la arquitectura HTML-first ni el fallback pdf-lib.
- No se cambian los endpoints tRPC.
- No se migra de snapshot inmutable a lectura viva.
- No se refactoriza el renderer a múltiples archivos.
- No se agrega paginación "Página X de Y".
- No se agrega banner UI de fallback.
- No se toca la política de lifecycle de Storage.
- No se modifica la decisión de partición 7 vs 8 (solo se documenta en ADR).
