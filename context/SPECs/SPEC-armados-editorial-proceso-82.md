# SPEC: Armados Editoriales Cliente v2

**ID:** ARCH-20260408-06  
**Autor:** INTEGRA  
**Fecha:** 2026-04-08  
**Estado:** En revisión

---

## 1. Resumen Ejecutivo

Separar el frente de Armados como una refactorización editorial dedicada para que el reporte final del cliente deje de depender del generador legado incompleto y pase a una composición visual, ordenada y consistente con toda la información realmente disponible en el proceso.

El análisis sobre el proceso 82 muestra que hoy existe suficiente data para producir un entregable mucho más completo, pero el renderer actual no la consume de forma homogénea y además limita el peso visual de las evidencias. Esta SPEC define la corrección de fondo: usar el snapshot editorial como única fuente de verdad, alinear el renderer con la estructura actual del proceso y rediseñar el layout de imágenes para que cada evidencia tenga presencia editorial de media página.

---

## 2. Contexto y Problema

### 2.1 Situación Actual

- La tab de Armados en [integra-rh-manus/client/src/pages/ProcesoDetalle.tsx](integra-rh-manus/client/src/pages/ProcesoDetalle.tsx) sí genera un snapshot editorial con `candidate`, `client`, `post`, `process`, `workHistory` y `documents`.
- El renderer HTML editorial existe en [integra-rh-manus/server/utils/armadoHtmlRenderer.ts](integra-rh-manus/server/utils/armadoHtmlRenderer.ts), pero el PDF que se publica hoy sigue saliendo del generador legado en [integra-rh-manus/server/utils/estudiosocioPdf.ts](integra-rh-manus/server/utils/estudiosocioPdf.ts).
- El proceso 82 contiene un payload moderno y amplio en `visitaDetalle`, con secciones nuevas y nombres de campos ya consolidados en operación.

### 2.2 Problema a Resolver

El armado actual falla en tres niveles:

1. **Cobertura de datos incompleta**
   El renderer actual sigue leyendo varias llaves legacy y por eso no consume correctamente la estructura moderna del expediente.

2. **Orden editorial débil**
   El documento mezcla bloques tabulares y narrativos sin jerarquía suficiente para lectura cliente, especialmente en captura de visita.

3. **Tratamiento visual pobre de imágenes**
   Las evidencias se renderizan como una grilla pequeña con `max-height: 220px`, sin protagonismo ni composición editorial.

### 2.3 Usuarios Afectados

- Analistas internas que revisan y publican armados.
- Cliente final que recibe el PDF publicado.
- Dirección operativa que necesita un entregable limpio, ordenado y visualmente fuerte.

---

## 3. Hallazgos del Análisis de Proceso 82

### 3.1 Inventario Real Disponible

Usando el proceso 82 como caso de validación, hoy existe al menos esta información utilizable:

- `workHistory`: 2 empleos verificados con `investigacionDetalle` y `resultadoVerificacion`.
- `documents`: 19 documentos por proceso.
- `investigacionLegal`: antecedentes y 3 evidencias gráficas.
- `semanasDetalle`: comentario y 4 evidencias gráficas.
- `antecedentesPenales`: comentarios y 2 evidencias gráficas.
- `buroCredito`: PDF cargado.
- `visitaDetalle` con bloques poblados de:
  - `ubicacion`
  - `academica`
  - `documentos`
  - `familiares`
  - `dinamicaFamiliar`
  - `inmueble`
  - `vivienda`
  - `salud`
  - `social`
  - `juridica`
  - `otrosDatos`
  - `patrimonio`
  - `ingresos`
  - `egresos`
  - `creditos`
  - `refPersonales`
  - `refVecinales`
  - `fotos`
  - `cierre`
  - `conclusion`

### 3.2 Brechas Detectadas en el Renderer Actual

En [integra-rh-manus/server/utils/armadoHtmlRenderer.ts](integra-rh-manus/server/utils/armadoHtmlRenderer.ts) se identificaron estos desfases:

- `academica` se lee con nombres legacy como `ultimoGrado` y `documentoObtenido`, pero el payload actual usa `gradoEstudios` y `documento`.
- `ingresos` se sigue buscando como `ingresosArray` con campos `ingreso` y `aportacionTotal`, pero el payload actual usa `ingresos` con `sueldo` y `otrosIngresos`.
- `otrasPersonasDomicilio` ya no coincide con el payload actual, que usa `otrasPersonas`.
- `dinamicaVivienda` ya no coincide con el payload actual, que usa `vivienda`.
- `social` y `salud` siguen mapeos parciales y legacy, por lo que hoy se pierde parte del contenido útil.
- `documentos` en captura visita solo muestra si presentó o no, pero no ordena ni prioriza fotos, reversos, titularidad, AFORE, Infonavit y anexos documentales de forma editorial.
- Las evidencias se renderizan pequeñas y sin agrupación por sección investigada.

### 3.3 Causa Raíz

El snapshot ya trae la información suficiente. El problema principal está en que la capa de presentación del armado no está alineada con el modelo actual del expediente ni con el objetivo editorial del PDF final.

---

## 4. Solución Propuesta

### 4.1 Descripción General

Construir `Armados Editoriales Cliente v2` como una refactorización del pipeline de salida para que:

- el snapshot editorial siga siendo la única fuente de verdad,
- el renderer consuma las llaves modernas del proceso,
- el HTML editorial sea la composición canónica,
- el PDF final se derive de esa misma composición,
- el índice del documento sea navegable en el preview y en el PDF publicado,
- la ubicación del domicilio combine mapa estático clicable y fotografía principal de fachada,
- las imágenes se muestren como recursos visuales de media página, con mejor jerarquía, orden y ritmo editorial.

### 4.2 Flujo de Usuario

1. La analista arma y guarda la versión desde la tab Armados.
2. El sistema congela el snapshot editorial inmutable.
3. La analista revisa el preview HTML de esa versión.
4. El PDF se genera desde la misma composición editorial revisada.
5. La analista publica la versión para el cliente.
6. El cliente abre un documento visualmente limpio, completo y consistente con la revisión aprobada.

### 4.3 Arquitectura

```text
ProcesoDetalle.tsx
  -> buildArmadoSnapshot()
  -> createLegacyReportDraft / versionado
  -> editorialSnapshot persistido

editorialSnapshot
  -> normalizador de datos editoriales
  -> renderArmadoHtml(snapshot, sections)
  -> renderHtmlToPdf(html)
  -> Storage / versión publicada

Portal Cliente
  -> abre solo la versión publicada vigente
```

### 4.4 Decisión Técnica Principal

La composición canónica debe migrar al flujo HTML-first ya existente y dejar de depender del armado legado en `pdf-lib` como superficie principal de layout.

Justificación:

- El HTML editorial permite una jerarquía visual más fuerte.
- Facilita páginas tipo spread de evidencia.
- Reduce duplicidad entre preview y PDF.
- Es más fácil sostener iteraciones visuales sin reescribir primitives manuales en `pdf-lib`.

---

## 5. Requisitos

### 5.1 Funcionales

- [ ] RF-01: El armado debe consumir correctamente la estructura moderna del snapshot del proceso 82 sin depender de nombres legacy rotos.
- [ ] RF-02: La sección `captura_visita` debe mostrar todos los bloques con datos reales disponibles del expediente, en orden editorial claro.
- [ ] RF-03: La sección `documentos` debe dejar de ser un simple listado plano y presentar anexos por grupos lógicos y prioridad visual.
- [ ] RF-04: Las secciones `investigacion_legal`, `semanas_cotizadas`, `antecedentes_penales` y `buro_credito` deben integrar evidencias y anexos de forma consistente.
- [ ] RF-05: Las imágenes dentro del armado deben renderizarse en layout editorial de media página, con caption visible y agrupación por tema.
- [ ] RF-06: El orden del documento debe ser fijo y predecible, sin bloques amontonados ni cortes visuales arbitrarios.
- [ ] RF-07: El preview HTML y el PDF final deben representar la misma narrativa editorial.
- [ ] RF-08: El documento debe seguir soportando publicación versionada y acceso controlado del cliente.
- [ ] RF-09: El documento debe incluir un índice visible con enlaces internos funcionales hacia portada, resumen y secciones seleccionadas.
- [ ] RF-10: El PDF publicado debe conservar navegación clicable en el índice y enlaces externos relevantes.
- [ ] RF-11: La sección de ubicación del domicilio debe mostrar `ubicacion.mapaCapturaUrl` como mapa principal clicable hacia Google Maps.
- [ ] RF-12: Debajo del mapa debe mostrarse la fachada principal del domicilio usando `visitaDetalle.fotos.fachadaCalle` como fuente preferente y `fachadaPatio` como fallback.
- [ ] RF-13: El bloque de ubicación debe incluir dirección y coordenadas cuando existan datos suficientes en `ubicacion.gps` o en el domicilio capturado.

### 5.2 No Funcionales

- [ ] RNF-01: Legibilidad. Ninguna sección debe depender de tablas densas como única forma de lectura cuando el contenido sea narrativo o visual.
- [ ] RNF-02: Consistencia. No debe existir divergencia entre keys modernas del snapshot y keys consumidas por el renderer.
- [ ] RNF-03: Estabilidad. El proceso 82 debe renderizar completo sin errores de build, sin excepciones en runtime y sin huecos por llaves faltantes.
- [ ] RNF-04: Performance. La generación del preview y del PDF debe mantenerse dentro del flujo actual sin introducir timeouts operativos regresivos.
- [ ] RNF-05: Seguridad. El cliente seguirá viendo solo la versión publicada y nunca borradores ni campos internos excluidos.
- [ ] RNF-06: Navegabilidad. Los anchors internos y enlaces externos deben sobrevivir a la exportación PDF final en el flujo HTML-first.

---

## 6. Diseño Técnico

### 6.1 Modelo de Datos Editorial

Se introduce una capa de normalización editorial, sin cambiar esquema de base.

Objetos editoriales propuestos:

- `editorialSummary`
- `editorialEmployment[]`
- `editorialSectionAttachments[]`
- `editorialVisitProfile`
- `editorialEvidenceSpread[]`

La normalización debe traducir el snapshot bruto a un modelo listo para composición visual.

### 6.2 Componentes / Módulos a Intervenir

- [integra-rh-manus/client/src/pages/ProcesoDetalle.tsx](integra-rh-manus/client/src/pages/ProcesoDetalle.tsx)
  Ajustes menores solo si hace falta alinear textos o preview.

- [integra-rh-manus/server/utils/armadoHtmlRenderer.ts](integra-rh-manus/server/utils/armadoHtmlRenderer.ts)
  Refactor principal de composición editorial, orden de secciones, mapeos modernos y layout visual.

- [integra-rh-manus/server/utils/armadoPdfFromHtml.ts](integra-rh-manus/server/utils/armadoPdfFromHtml.ts)
  Fuente de PDF final desde HTML revisado.

- [integra-rh-manus/server/utils/estudiosocioPdf.ts](integra-rh-manus/server/utils/estudiosocioPdf.ts)
  Reencaminar `generarArmadoClientePDF` al flujo HTML-first o dejarlo como wrapper controlado.

- [integra-rh-manus/server/utils/estudiosocioPdf.test.ts](integra-rh-manus/server/utils/estudiosocioPdf.test.ts)
  Casos de cobertura para estructura moderna y proceso 82.

- [integra-rh-manus/server/utils/armadoPdfFromHtml.test.ts](integra-rh-manus/server/utils/armadoPdfFromHtml.test.ts)
  Validación del pipeline HTML -> PDF.

### 6.3 Diseño Editorial del Documento

Orden objetivo:

1. Portada
2. Índice
3. Resumen ejecutivo
4. Generales del candidato
5. Trayectoria laboral verificada
6. Hallazgos legales y de cumplimiento
7. Semanas cotizadas y cotejo IMSS
8. Buró y anexos financieros
9. Visita domiciliaria ejecutiva
10. Cuestionario socioeconómico completo
11. Evidencias visuales por bloque
12. Conclusión y cierre

### 6.4 Bloque Editorial de Ubicación

La sección de visita domiciliaria debe incluir un bloque hero de ubicación con esta jerarquía:

1. Mapa del domicilio en formato protagonista, equivalente a media página útil.
2. Enlace clicable a Google Maps sobre el mapa o inmediatamente debajo.
3. Línea de apoyo con dirección y coordenadas cuando existan.
4. Fotografía de fachada justo debajo del mapa.

Fuentes obligatorias:

- Mapa estático: `visitaDetalle.ubicacion.mapaCapturaUrl`
- Coordenadas y link externo: `visitaDetalle.ubicacion.gps`
- Fachada principal: `visitaDetalle.fotos.fachadaCalle`
- Fachada fallback: `visitaDetalle.fotos.fachadaPatio`

Regla editorial:

- Si existe `fachadaCalle`, esa imagen debe ser la principal debajo del mapa.
- Si no existe `fachadaCalle` pero sí `fachadaPatio`, se usa `fachadaPatio` como fallback.
- Si existen ambas, `fachadaPatio` queda como evidencia secundaria y no compite con la foto principal.

### 6.5 Regla Visual para Imágenes

- Cada evidencia principal debe tener un bloque editorial de media página.
- Cuando una sección tenga varias imágenes, deben organizarse en spreads visuales, no en una sola grilla diminuta.
- Altura objetivo por imagen principal: entre 42% y 55% de la altura útil de página.
- Deben incluir caption corto y contexto de sección.
- En fotos de visita, debe existir prioridad visual para fachada, cocina, sala, comedor y evidencias complementarias.

### 6.6 Índice y Navegación

- La portada debe tener anchor válido y estable para que el índice no rompa al abrir el preview o el PDF.
- El índice debe listar portada, resumen ejecutivo y todas las secciones activas en el orden editorial real.
- Los enlaces internos deben funcionar desde la vista HTML y desde el PDF final publicado.
- Los enlaces externos válidos, como Google Maps, deben conservar clicabilidad en el PDF exportado.

### 6.7 Estrategia de Normalización

La capa editorial debe soportar ambas formas mientras exista deuda legacy:

- usar key moderna como preferente,
- caer a key legacy cuando sea necesario,
- centralizar esa decisión en helpers y no repartirla por toda la plantilla.

Ejemplos obligatorios:

- `academica.gradoEstudios -> academica.ultimoGrado`
- `academica.documento -> academica.documentoObtenido`
- `ingresos -> ingresosArray`
- `vivienda -> dinamicaVivienda`
- `otrasPersonas -> otrasPersonasDomicilio`
- `refPersonales/refVecinales -> referenciasPersonales/referenciasVecinales`

---

## 7. Plan de Implementación

### 7.1 Tareas

| # | Tarea | Estimación | Asignado |
|---|-------|------------|----------|
| 1 | Inventario y normalización de snapshot editorial moderno vs legacy | 2h | SOFIA |
| 2 | Refactor de `armadoHtmlRenderer.ts` por secciones editoriales | 4h | SOFIA |
| 3 | Implementar índice navegable y corregir anchors base del documento | 1.5h | SOFIA |
| 4 | Implementar bloque hero de ubicación: mapa clicable + fachada principal debajo | 2.5h | SOFIA |
| 5 | Reencaminar `generarArmadoClientePDF` al flujo HTML-first | 2h | SOFIA |
| 6 | Rediseñar el bloque de evidencias con imágenes de media página | 3h | SOFIA |
| 7 | Añadir pruebas del proceso 82 y casos de regresión | 2h | SOFIA |
| 8 | Validar navegación del índice y Google Maps en preview/PDF publicado | 1h | SOFIA |
| 9 | Validación manual en preview interno y portal cliente | 1.5h | SOFIA + Usuario |

### 7.2 Dependencias

- Snapshot de Armados ya disponible en [integra-rh-manus/client/src/pages/ProcesoDetalle.tsx](integra-rh-manus/client/src/pages/ProcesoDetalle.tsx).
- Renderer HTML existente en [integra-rh-manus/server/utils/armadoHtmlRenderer.ts](integra-rh-manus/server/utils/armadoHtmlRenderer.ts).
- Pipeline HTML -> PDF existente en [integra-rh-manus/server/utils/armadoPdfFromHtml.ts](integra-rh-manus/server/utils/armadoPdfFromHtml.ts).

### 7.3 Riesgos

| Riesgo | Mitigación |
|--------|------------|
| Divergencia entre preview y PDF | Hacer del HTML editorial la composición canónica y generar PDF desde ahí |
| Campos legacy y modernos mezclados | Centralizar normalización en helpers editoriales |
| Imágenes demasiado pesadas o cortes feos en paginación | Definir componentes de spread con reglas de tamaño y page-break controlado |
| Regresión en versiones publicadas | Mantener mismo modelo de versionado y solo cambiar la capa de render |
| Enlaces clicables perdidos en exportación PDF | Validar el flujo HTML-first con pruebas específicas de anchors internos y links externos |

### 7.4 Micro-Sprints Propuestos

Para que SOFIA trabaje sin entregar funcionalidad a medias, este trabajo se parte en dos micro-sprints consecutivos:

1. `MS-2026-04-08-armados-v2-fase-1.md`
  Alcance: normalización, índice navegable, corrección de anchors y bloque hero de ubicación.

2. `MS-2026-04-08-armados-v2-fase-2.md`
  Alcance: HTML-first publicado, spreads editoriales de evidencias, pruebas, validación final y publicación.

---

## 8. Criterios de Aceptación

- [ ] CA-01: El proceso 82 debe mostrar en el armado todas las secciones con data real hoy disponible, sin huecos por nombres de campo obsoletos.
- [ ] CA-02: La sección de captura de visita debe incluir académica, documentos, familiares, dinámica familiar, inmueble, vivienda, salud, social, jurídica, patrimonio, ingresos, egresos, créditos, referencias y cierre cuando existan datos.
- [ ] CA-03: Las evidencias legales, IMSS, antecedentes y buró deben verse agrupadas editorialmente y no como texto plano o anexos ambiguos.
- [ ] CA-04: Las imágenes principales deben ocupar media página visual aproximada, con caption y separación clara por bloque.
- [ ] CA-05: El preview HTML y el PDF final deben conservar el mismo orden narrativo y la misma estructura visible.
- [ ] CA-06: La build del proyecto y las pruebas del renderer/PDF deben pasar sin errores nuevos.
- [ ] CA-07: El cliente debe seguir accediendo solo a la versión publicada vigente, sin cambios de seguridad ni de versionado.
- [ ] CA-08: El índice del documento debe verse en el preview y en el PDF publicado, y cada entrada debe navegar a su sección correcta.
- [ ] CA-09: La portada debe contar con anchor válido para evitar enlaces rotos desde el índice.
- [ ] CA-10: La visita domiciliaria debe mostrar un mapa grande del domicilio con enlace clicable a Google Maps.
- [ ] CA-11: Debajo del mapa debe verse la fachada principal del domicilio, usando `fachadaCalle` preferentemente y `fachadaPatio` como fallback.
- [ ] CA-12: La validación con proceso 82 debe demostrar que el bloque de ubicación y las evidencias visuales se renderizan con jerarquía editorial alta.

---

## 9. Recomendación Operativa

Este trabajo debe ejecutarse como micro-sprint separado del ajuste de historial laboral, porque combina:

- deuda de mapeo de datos,
- refactor de render,
- decisión de arquitectura de salida PDF,
- rediseño visual del entregable.

La implementación debe recaer en SOFIA con esta SPEC como contrato base.