# DICTAMEN TÉCNICO: Revisión forense de la SPEC de Armados cliente
- **ID:** FIX-20260320-03
- **Fecha:** 2026-03-20
- **Solicitante:** INTEGRA
- **Estado:** ✅ VALIDADO

### A. Análisis de Causa Raíz
La SPEC fija correctamente el objetivo de tener un único entregable editorial por versión y declara explícitamente que HTML y PDF deben salir del mismo snapshot editorial. Sin embargo, el contrato técnico todavía no define varios invariantes necesarios para hacer eso verificable en implementación: qué se persiste exactamente como snapshot, cómo se congela la revisión HTML, cómo se evita re-renderizar contra datos vivos, cómo se resuelve la numeración final del índice y qué subcomponentes opcionales heredan o no la selección de su sección madre.

**Hallazgos forenses:**

1. **El modelo de versionado no guarda el snapshot editorial inmutable que la propia SPEC exige.** La SPEC obliga a que HTML y PDF salgan del mismo snapshot y que ninguna superficie lea datos vivos tras congelar la versión, pero la entidad propuesta solo persiste metadatos operativos (`sections`, `storagePath`, `url`, estado y actoría). Falta el payload editorial congelado, una huella/versionado del renderer y una definición de si la publicación reutiliza exactamente el artefacto draft o lo vuelve a renderizar. Así, la garantía central del documento queda enunciada, pero no contratada.

2. **La revisión HTML existe como concepto de producto, pero no como objeto técnico versionado.** La SPEC pide preview HTML interno del mismo documento editorial, pero el flujo técnico detallado solo describe generación de PDF draft y almacenamiento de su URL. No queda definido si el preview se materializa desde un snapshot persistido, si se recalcula al abrirlo, ni cómo se selecciona el draft activo cuando hay múltiples borradores. Eso abre una vía directa de divergencia entre preview y PDF aunque el principio rector diga lo contrario.

3. **La composición editorial mezcla secciones explícitas, secciones derivadas y anexos sin contrato de obligatoriedad.** El orden editorial incluye portada, índice, resumen ejecutivo y anexos, pero el JSON de `sections` solo cubre ocho bloques funcionales. No se define si portada, índice y resumen ejecutivo son siempre obligatorios, si pueden omitirse cuando no hay suficiente contenido, ni cómo se activa el bloque de anexos. Sin esa clasificación, el índice dinámico y la continuidad editorial quedan sujetos a interpretación del implementador.

4. **Las reglas de secciones opcionales son insuficientes a nivel de subcomponente.** La SPEC dice que `antecedentesPenales` debe absorberse dentro de Investigación legal o definirse como subcomponente obligatorio; también permite evidencias, fotografías y anexos “si la analista decide incluirlos”. Pero la interfaz propuesta solo tiene checkboxes a nivel de sección. Falta definir qué piezas son herencia automática de la sección, cuáles son opcionales internas y cuáles requieren controles adicionales. Ese vacío impacta snapshot, preview, PDF e historial.

5. **El índice dinámico está definido en intención, no en mecanismo.** Se pide índice con navegación, numeración real, anclas válidas y paginación limpia, pero no se define el punto exacto en que se congelan números de página, cómo se resuelve el índice si el layout cambia por anexos pesados, ni cómo se comportan secciones largas fragmentadas. El riesgo es terminar con una implementación que funcione visualmente en HTML pero no pueda prometer índices estables y correctos en PDF.

6. **La continuidad editorial está descrita de forma cualitativa, no verificable.** Expresiones como “continuidad narrativa”, “contexto mínimo”, “bloque de apertura” y “reglas claras de continuidad” son correctas a nivel editorial, pero no hay criterios operativos por sección para decidir cuándo renderizar, cuándo colapsar una sección vacía, qué texto de transición usar y qué constituye una sección suficientemente completa como para aparecer en índice y cuerpo. Esto deja demasiado margen de divergencia entre implementaciones.

7. **El flujo de revisión de borradores queda ambiguo cuando existen múltiples drafts.** La SPEC permite múltiples versiones `draft`, pero el bloque de revisión se comporta como si hubiera un único borrador activo y expone acciones singulares como `Abrir PDF borrador`. No se define si la preview HTML corresponde al draft más reciente, al seleccionado en historial o a un draft “actual” separado. Esa ambigüedad afecta trazabilidad y puede inducir publicación de una versión distinta a la revisada.

8. **Los enlaces interactivos hacia originales pueden romper la frontera entre entregable editorial y evidencia operativa.** Se exige que fotos, mapas y evidencias abran el original cuando aplique, pero no se define si esos enlaces deben ser firmados, temporales, públicos o rehidratables desde permisos cliente. Sin esa regla, el PDF podría enlazar a artefactos que luego caducan, cambian o exponen material fuera del alcance editorial aprobado.

**Segunda opinión Qodo:** se intentó ejecutar revisión de solo lectura, pero la herramienta respondió límite de uso alcanzado y no entregó análisis útil.

### B. Justificación de la Solución
No apliqué cambios de código porque la solicitud fue una revisión crítica de la SPEC. El valor aquí no está en tocar implementación sino en cerrar ambigüedades antes de que se conviertan en deuda estructural. La causa raíz de los riesgos detectados es que la SPEC ya fija correctamente el “qué” editorial, pero todavía no termina de fijar el “cómo” de inmovilización, reproducción y validación del entregable por versión.

### C. Instrucciones de Handoff para INTEGRA
1. Añadir al modelo `processReportVersions` un campo de snapshot editorial inmutable, por ejemplo `editorialSnapshot`, separado del `sections` de selección y suficiente para renderizar HTML y PDF sin leer datos vivos.
2. Definir si publicar reutiliza exactamente el artefacto draft aprobado o si rehace render; si rehace render, exigir checksum del snapshot y versión de renderer para demostrar equivalencia.
3. Clasificar explícitamente las piezas del documento en tres tipos: siempre presentes, derivadas y opcionales. Como mínimo: portada, índice y resumen ejecutivo; secciones checkbox; anexos/evidencias.
4. Formalizar el esquema de subcomponentes opcionales por sección. Ejemplo: Investigación legal incluye `antecedentesPenales`; Visita domiciliaria incluye fotos; Documentos incluye soportes. Cada uno debe tener regla de herencia o control explícito.
5. Añadir reglas de snapshot para assets: qué URLs se congelan, qué expiración aceptan y qué ocurre si el original deja de estar disponible después de publicar.
6. Definir una noción de “draft en revisión”: versión seleccionada explícitamente en historial o siempre la más reciente, pero no ambas.
7. Convertir la continuidad editorial en criterios verificables por módulo: umbral mínimo de contenido, comportamiento si un bloque queda vacío, tratamiento de transiciones y condición para entrar al índice.
8. Especificar el algoritmo operativo del índice PDF: fase de layout, resolución final de páginas, manejo de anexos y comportamiento cuando una sección se fragmenta en varias páginas.