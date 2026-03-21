# SPEC: Armados Dinámicos de Estudio para Cliente

**ID:** ARCH-20260320-25  
**Ruta:** context/SPECs/SPEC-pdf-dinamico-estudio-cliente.md  
**Fecha:** 2026-03-20  
**Alcance:** Proceso → Expediente interno → Armado, revisión, publicación y envío controlado de PDF para cliente

---

## Objetivo

Permitir que las analistas armen un documento editorial final de estudio de forma manual, marcando con checkboxes qué información desean incluir antes de compartirlo con el cliente.

El armado debe comportarse como un entregable editorial:

- Se compone primero como borrador interno consultable en HTML.
- No debe ser visible para el cliente hasta que una analista lo publique o lo envíe explícitamente.
- Cada nueva generación debe conservar historial y nunca sobrescribir la versión anterior.
- El PDF final debe derivarse del mismo contenido editorial aprobado, sin crear una segunda narrativa o una variante paralela del documento.

---

## Principio Rector del Entregable

El sistema debe manejar un solo entregable editorial por versión.

- No existirán dos reportes distintos, uno HTML y otro PDF con contenidos divergentes.
- Existirá una sola composición editorial por versión.
- Esa composición podrá verse en revisión interna como HTML.
- Esa misma composición podrá exportarse como PDF navegable, paginado e interactivo.

Regla obligatoria:

- HTML y PDF deben salir del mismo snapshot editorial.
- Ninguna de las dos superficies puede leer datos vivos del proceso una vez congelada la versión.
- El cambio de `draft` a `published` cambia el estado editorial y la visibilidad, no la naturaleza del entregable.

---

## Reglas de Negocio

### 1. Visibilidad controlada

- Un PDF recién generado queda en estado `draft`.
- El cliente no puede ver PDFs en `draft`.
- Solo la última versión en estado `published` será visible en el portal del cliente.

### 2. Historial obligatorio

- Si una analista genera un nuevo PDF, el anterior debe mantenerse como historial.
- El sistema no debe sobrescribir ni reciclar el archivo anterior.
- Debe existir trazabilidad de quién generó, qué incluyó y cuándo publicó.

### 2.1 Documento único por versión

- Cada versión debe tener un único snapshot editorial como fuente de verdad.
- La revisión interna en HTML y el PDF publicado deben derivarse del mismo snapshot.
- No se permite mantener plantillas editoriales separadas que puedan divergir entre preview y PDF final.

### 2.2 Snapshot editorial inmutable

- Cada versión debe persistir un `editorialSnapshot` inmutable con todos los datos ya resueltos y aprobados para cliente.
- El `editorialSnapshot` no puede reconstruirse leyendo datos vivos del proceso al abrir el preview o al publicar.
- Publicar una versión debe reutilizar exactamente el snapshot revisado, no volver a consolidar información desde la base operativa.
- Si por razones técnicas el PDF se regenera al publicar, el sistema debe garantizar equivalencia funcional respecto del snapshot revisado.

### 3. Selección manual sin presets

- No habrá presets automáticos por tipo de estudio o producto.
- Las analistas decidirán manualmente qué secciones incluir mediante checkboxes.

### 3.1 Composición dinámica por módulos

- Las secciones seleccionadas deben ensamblarse dinámicamente en el orden editorial definido por el sistema.
- Si una sección intermedia no fue seleccionada, el documento debe cerrar el espacio de forma natural sin dejar huecos visuales, títulos huérfanos o bloques cortados.
- Cada módulo debe poder renderizarse como una unidad autónoma y consistente, independientemente de si va acompañado por el resto de secciones.
- El documento nunca debe depender de que estén seleccionadas todas las secciones para verse correcto.

### 5. Psicométricos fuera de alcance por ahora

- La información psicométrica no formará parte del PDF final del estudio en esta primera etapa de `Armados`.
- No se elimina del sistema.
- No se borra del modelo de datos.
- No se expone en checkboxes ni en el entregable al cliente, salvo decisión futura explícita.

### 6. Comentarios de candidato fuera del entregable

- Los registros de `candidateComments` quedan explícitamente fuera del PDF final de cliente.
- Pueden seguir existiendo como insumo interno operativo.
- No deben mapearse a checkboxes, snapshot editorial ni salida publicada de `Armados`.

### 4. Aviso de privacidad fuera del PDF final

- El aviso de privacidad de Sinergia RH se conserva como documento separado.
- No forma parte del PDF final enviado al cliente.
- La aceptación o referencia interna del aviso solo debe vivir en expediente interno.

---

## UX Propuesta

### Pantalla interna de Armados

Dentro del expediente del proceso se agrega una sección llamada `Armados` con:

- Lista de checkboxes por sección.
- Vista previa HTML de secciones seleccionadas.
- Acción `Generar borrador`.
- Acción `Revisar armado`.
- Historial de versiones previas.
- Acción `Publicar para cliente` sobre una versión específica.
- Acción `Enviar al cliente` sobre la versión publicada vigente.

### Modalidad de revisión interna

La revisión del armado debe ocurrir sobre una vista HTML interna del mismo documento editorial.

Objetivos de esta superficie:

- validar orden de lectura
- validar continuidad entre secciones seleccionadas
- validar imágenes, mapa, anexos y bloques visuales
- validar que no exista contenido interno expuesto por error
- validar el resultado antes de publicar o exportar

La revisión HTML no sustituye al PDF final del cliente.

- Es una superficie de validación interna previa a publicación.
- El entregable formal para cliente sigue siendo el PDF publicado.

Contrato mínimo de la revisión:

- Cada versión `draft` debe tener su propio preview HTML asociado.
- La revisión siempre debe estar amarrada a una versión específica, nunca a un estado global difuso del proceso.
- Si existen múltiples borradores, la interfaz debe dejar claro cuál es la `versión en revisión`.
- No se debe permitir revisar una versión y publicar otra por error de interfaz.

### Secciones visibles para las analistas

Los nombres deben ser intuitivos y consistentes con el lenguaje operativo actual:

- `Generales del candidato`
- `Documentos`
- `Investigación laboral`
- `Investigación legal`
- `Semanas cotizadas`
- `Buró de crédito`
- `Visita domiciliaria`
- `Observaciones y conclusión`

Adicionalmente, el documento debe manejar bloques editoriales no opcionales o derivados:

- `Portada` como bloque siempre presente
- `Índice` como bloque siempre presente
- `Resumen ejecutivo` como bloque siempre presente si existe contenido mínimo
- `Anexos o evidencias` como bloque derivado cuando la selección activa incluya recursos enlazables o galerías

No se incluirá una sección de `Psicométricos` en esta fase.

### Orden recomendado en la interfaz

1. Checkboxes de secciones
2. Resumen de selección
3. Botón `Generar borrador`
4. Espacio de revisión del armado
5. Tabla de versiones generadas
6. Acción `Publicar para cliente`
7. Acción `Enviar al cliente`

### Orden editorial del documento

El documento debe respetar un orden editorial fijo cuando las secciones existan, pero su composición debe ser flexible cuando una o varias secciones estén ausentes.

Orden objetivo:

1. Portada
2. Índice
3. Resumen ejecutivo
4. Generales del candidato
5. Documentos
6. Investigación laboral
7. Investigación legal
8. Semanas cotizadas
9. Buró de crédito
10. Visita domiciliaria
11. Observaciones y conclusión
12. Evidencias o anexos seleccionados

Regla:

- Si una sección no fue seleccionada, el resto debe reacomodarse sin romper numeración visual, continuidad narrativa ni consistencia de layout.

### Taxonomía editorial obligatoria

Para evitar ambigüedades, los bloques del documento se clasifican así:

- `Siempre presentes`: portada, índice, identidad visual, pie editorial, paginación
- `Derivados`: resumen ejecutivo, anexos, galerías, bloque de evidencias, referencias enlazables
- `Opcionales`: las ocho secciones seleccionables por checkbox

Reglas:

- Los bloques `siempre presentes` no dependen de checkboxes.
- Los bloques `derivados` aparecen solo si el snapshot contiene contenido suficiente o si una sección activa los requiere.
- Los bloques `opcionales` dependen de la selección explícita de la analista.

### Layout propuesto de la tab `Armados`

La nueva tab debe agregarse en `ProcesoDetalle` junto a:

- `Expediente`
- `Visitas`
- `Documentos`

Orden sugerido de tabs:

- `Expediente`
- `Visitas`
- `Armados`
- `Documentos`

#### Bloque 1: Resumen del armado actual

Card superior con estado visible y lectura rápida:

- estado actual: `Sin armado`, `Borrador disponible`, `Publicado`
- versión publicada vigente
- fecha de última generación
- fecha de última publicación
- usuario que publicó

Acciones visibles en header:

- `Generar borrador`
- `Abrir publicado` si existe
- `Enviar al cliente` si existe versión publicada

#### Bloque 2: Secciones a incluir

Card principal con checkboxes en grilla simple, 2 columnas en desktop y 1 en móvil:

- Generales del candidato
- Documentos
- Investigación laboral
- Investigación legal
- Semanas cotizadas
- Buró de crédito
- Visita domiciliaria
- Observaciones y conclusión

Cada checkbox debe incluir:

- nombre de la sección
- descripción breve en texto secundario
- indicador de fuente de datos si ayuda a depuración interna

#### Bloque 3: Resumen de selección

Card de apoyo con:

- contador de secciones seleccionadas
- lista compacta tipo chips con las secciones activas
- advertencia si no hay ninguna sección seleccionada

#### Bloque 4: Revisión del borrador

Card para revisión operativa:

- vista previa HTML consultable
- enlace o botón `Abrir PDF borrador`
- nota: `Revise el armado antes de publicar`
- acción secundaria `Generar nueva versión`
- indicador visible de `Versión en revisión`

Este bloque solo aparece si existe al menos una versión `draft`.

#### Bloque 5: Historial de versiones

Tabla con columnas:

- versión
- estado
- fecha de generación
- generado por
- secciones
- fecha de publicación
- acciones

Acciones por fila:

- `Abrir`
- `Publicar`
- `Enviar al cliente` solo para la versión publicada

#### Bloque 6: Confirmaciones operativas

Para evitar errores:

- confirmar antes de publicar una versión nueva
- confirmar antes de enviar al cliente
- mostrar claramente que publicar una nueva versión reemplaza la visible anterior

#### Comportamiento responsivo

- en móvil, la tabla de historial debe colapsar a cards por versión
- los checkboxes deben seguir siendo legibles sin scroll horizontal
- el header debe priorizar estado y botón principal `Generar borrador`

---

## Requisitos del PDF Final

El PDF final del cliente debe ser un documento consultable, formal e interactivo dentro de las capacidades del formato.

### 1. Navegación

- Debe existir un índice al inicio.
- Cada elemento del índice debe llevar a la sección correspondiente del documento.
- La navegación debe funcionar aun cuando no estén presentes todas las secciones.
- La numeración del índice debe reflejar el documento realmente generado, no una estructura teórica fija.
- El índice debe mostrar el número de página inicial de cada sección incluida.

### 2. Paginación

- El PDF debe estar paginado.
- Cada página debe mostrar el número actual y el total.
- Las secciones deben iniciar de forma limpia, evitando títulos al final de página sin contenido asociado.
- Deben existir saltos de página controlados para bloques visuales grandes.
- El algoritmo de paginación debe congelarse después del layout real del documento y antes de persistir el artefacto final.

### 3. Enlaces interactivos

- El mapa estático debe abrir Google Maps al hacer clic.
- Las fotografías o imágenes estáticas deben abrir la versión original a tamaño completo al hacer clic.
- Los documentos o evidencias enlazables deben conservar acceso al original cuando aplique.
- Los enlaces no deben romper la legibilidad del PDF impreso.

Política de enlaces:

- Los enlaces deben apuntar a URLs durables o regenerables bajo control del sistema.
- No se deben persistir en el PDF enlaces efímeros que expiren sin estrategia de renovación.
- Si un original deja de estar disponible, el documento debe conservar al menos su representación estática y metadatos descriptivos.
- En impresión, los enlaces deben degradar con elegancia: mostrar texto descriptivo o referencia visible sin afectar limpieza visual.

### 4. Consistencia visual

- La ausencia de una sección no debe provocar cortes visuales ni encabezados aislados.
- Cada módulo debe heredar espaciado, separación y ritmo visual consistentes.
- El documento debe verse continuo, aunque haya sido armado con un subconjunto de secciones.

---

## Requisitos de Composición Dinámica

### 1. Módulos autónomos

Cada sección debe construirse como un módulo editorial autónomo con:

- encabezado
- resumen o bloque de apertura
- contenido principal
- evidencias opcionales
- reglas de cierre

Esto permite que el generador inserte o remueva módulos sin romper el flujo del documento.

### 2. Reglas de continuidad

- Ninguna sección debe asumir que la sección anterior o posterior existe.
- Cada sección debe poder abrir con su propio contexto mínimo.
- Los divisores, encabezados y separadores deben renderizarse solo cuando haya contenido útil.
- Las secciones vacías no deben imprimirse como contenedores vacíos.

### 3. Reglas para evitar cortes

- No dejar encabezados solos al final de una página.
- No dividir tarjetas, galerías o bloques visuales si el espacio restante no alcanza para una presentación limpia.
- Si una sección contiene componentes pesados, debe empezar en página nueva cuando sea necesario.
- Si una subsección queda incompleta por altura, debe reubicarse de forma íntegra o fragmentarse con reglas claras de continuidad.

### 4. Índice dinámico

- El índice debe construirse a partir de las secciones realmente incluidas.
- El orden del índice debe seguir el orden editorial.
- Las anclas internas del PDF no deben apuntar a secciones inexistentes.

### 5. Coherencia entre preview y PDF

- El HTML de revisión y el PDF final deben compartir el mismo orden de secciones y la misma narrativa.
- Las diferencias entre ambos formatos solo pueden ser de presentación o capacidades del medio.
- No se permite que una sección aparezca en el preview y desaparezca en el PDF salvo por una regla editorial explícita.
- La estrategia de render debe priorizar fidelidad WYSIWYG: el PDF final debe generarse a partir del mismo HTML/CSS aprobado en revisión o de una representación funcionalmente equivalente controlada por el mismo renderer.

### 6. Umbral mínimo por sección

- Cada sección debe definir contenido mínimo para poder aparecer en el documento.
- Si una sección fue marcada pero no alcanza su umbral mínimo de datos, debe mostrarse un estado editorial breve y digno, o bien colapsarse según regla explícita.
- No se permiten secciones vacías con apariencia de error o formulario incompleto.

---

## Mapeo Interno de Secciones

Las analistas verán checkboxes simples, pero internamente cada uno podrá agrupar múltiples fuentes de datos.

### 1. Generales del candidato

**Fuente principal:** `candidates.perfilDetalle` + datos base del candidato y proceso

Incluye:

- nombre completo
- teléfono
- correo
- puesto
- plaza / CEDI
- fecha y lugar de nacimiento
- edad
- CURP / RFC / NSS
- domicilio
- estado civil
- redes sociales
- situación familiar base
- financiero / antecedentes declarativos básicos

### 2. Documentos

**Fuente principal:** `visitaDetalle.documentos` y, cuando aplique, soportes cargados en expediente

Incluye:

- acta de nacimiento
- credencial de elector
- comprobante de domicilio
- cartilla militar
- pasaporte
- visa americana
- cartas de recomendación
- licencia
- certificado / título
- Infonavit
- AFORE
- tipo de sangre

Subcomponentes derivados posibles:

- miniaturas
- enlace al original
- galería expandida
- anexos documentales al final

### 3. Investigación laboral

**Fuente principal:** `workHistory`

Incluye:

- empleos reportados
- fechas
- empresas
- puestos
- causal de salida
- resultado de verificación
- hallazgos relevantes por empleo
- resumen ejecutivo laboral

### 4. Investigación legal

**Fuente principal:** `processes.investigacionLegal`

Incluye:

- antecedentes / hallazgos
- evidencia asociada si se decide mostrar resumen documental

Subcomponentes obligatorios del mapeo:

- antecedentes penales cuando existan
- evidencias legales aprobadas para cliente cuando existan

### 5. Semanas cotizadas

**Fuente principal:** `processes.semanasDetalle` y/o datos laborales relacionados

Incluye:

- semanas cotizadas
- observaciones
- evidencia asociada si aplica

### 6. Buró de crédito

**Fuente principal:** `processes.buroCredito`

Incluye:

- estatus / resumen
- score si existe
- observaciones resumidas
- referencia al reporte, sin exponer material interno no aprobado

### 7. Visita domiciliaria

**Fuente principal:** `processes.visitaDetalle`

Incluye:

- ubicación y domicilio
- información académica capturada en visita
- estado de salud
- información social
- área jurídica
- datos familiares
- otras personas en domicilio
- economía familiar
- inmueble
- referencias vecinales y personales
- fotografías si la analista decide incluirlas

Subcomponentes derivados posibles:

- mapa estático enlazable
- galería fotográfica
- anexos visuales

### 8. Observaciones y conclusión

**Fuente principal:** redacción analista + datos consolidados del proceso

Incluye:

- resumen ejecutivo final
- observaciones consolidadas
- conclusión / calificación final

---

## Matriz de Cobertura Obligatoria Antes de Implementar

Esta matriz define el alcance mínimo para garantizar que el esqueleto del PDF dinámico no tenga que rearmarse después por omisiones de modelo.

### A. Datos base del candidato

Fuente: `candidates`

Campos existentes:

- `nombreCompleto`
- `email`
- `telefono`
- `medioDeRecepcion`
- `clienteId`
- `puestoId`
- `clientSiteId`

Regla:

- Deben ser soportables por el sistema de Armados, aunque no todos tengan que mostrarse por defecto en el PDF final.
- `nombreCompleto`, `telefono`, `email`, puesto y plaza deben poder renderizarse.
- `clienteId`, `puestoId`, `clientSiteId` pueden resolverse como nombres legibles en el snapshot.

### B. Perfil detallado del candidato

Fuente: `candidates.perfilDetalle`

Subbloques existentes:

- `generales`
- `domicilio`
- `redesSociales`
- `situacionFamiliar`
- `parejaNoviazgo`
- `financieroAntecedentes`
- `contactoEmergencia`
- `consentimiento`

Regla:

- Todos los subbloques anteriores deben poder mapearse al snapshot del Armado.
- `consentimiento` existe como dato del sistema, pero no debe imprimirse dentro del PDF final del estudio para cliente.
- `parejaNoviazgo` y `contactoEmergencia` hoy no están reflejados en la estructura del PDF actual; deben considerarse desde el diseño para evitar rehacer la estructura después.

### C. Dictamen laboral global del candidato

Fuente: `candidates.dictamenLaboral`

Campos existentes:

- `resultado`
- `comentariosGenerales`
- `completado`
- `completadoAt`

Regla:

- Debe poder alimentar la sección `Investigación laboral` o `Observaciones y conclusión`.
- No puede quedar fuera del modelo del Armado.

### D. Historial laboral detallado

Fuente: `workHistory`

Campos base existentes:

- empresa
- puesto
- fechaInicio
- fechaFin
- tiempoTrabajado
- tiempoTrabajadoEmpresa
- causalSalidaRH
- causalSalidaJefeInmediato
- contactoReferencia
- telefonoReferencia
- correoReferencia
- resultadoVerificacion
- estatusInvestigacion
- comentarioInvestigacion
- observaciones
- desempenoScore
- capturadoPor

Bloques estructurados existentes en `investigacionDetalle`:

- `empresa`
- `puesto`
- `periodo`
- `incidencias`
- `desempeno`
- `conclusion`
- `iaDictamen`
- `auditTrail`

Regla:

- Todo el historial laboral debe ser soportable por snapshot.
- El PDF final debe poder incluir al menos un resumen completo por empleo cuando la analista lo marque.
- `auditTrail` e `iaDictamen.soloUsoInterno` no deben exponerse automáticamente al cliente.

### E. Proceso y calificación final

Fuente: `processes`

Campos relevantes existentes:

- `clave`
- `tipoProducto`
- `fechaRecepcion`
- `fechaCierre`
- `fechaEnvio`
- `quienEnvio`
- `medioDeRecepcion`
- `estatusProceso`
- `calificacionFinal`
- `comentarioCalificacion`
- `estatusVisual`

Regla:

- Deben poder alimentar portada, trazabilidad editorial y conclusión final.
- `comentarioCalificacion` no debe perderse del modelo del Armado.

### F. Bloques del proceso

Fuentes existentes:

- `investigacionLaboral`
- `investigacionLegal`
- `semanasDetalle`
- `antecedentesPenales`
- `buroCredito`
- `visitaDetalle`
- `visitStatus`

Regla:

- Todos estos bloques deben estar contemplados en el modelo del Armado.
- Aunque algunas secciones no se muestren siempre al cliente, deben poder vaciarse si la analista las selecciona.
- `antecedentesPenales` hoy no aparece como checkbox explícito en la propuesta inicial; debe absorbese dentro de `Investigación legal` o definirse como subcomponente obligatorio de ese checkbox.

### G. Documentos y archivos del sistema

Fuente: `documents`

Tipos de documento detectados en el sistema:

- `PSICOMETRICO`
- `PSICOMETRICO_JSON`
- `CONSENTIMIENTO_DATOS_PERSONALES`
- `DICTAMEN`

Además existen soportes por URL embebidos en bloques del proceso y visita:

- evidencias gráficas legales
- evidencias de semanas cotizadas
- PDF y adicionales de buró de crédito
- fotos de visita
- cotejo documental de visita

Regla:

- El modelo del Armado debe soportar dos comportamientos:
  - renderizar contenido resumido dentro del PDF
  - o referenciar/adjuntar evidencia según la sección seleccionada
- La activación de evidencias debe obedecer reglas explícitas de subcomponentes, no inferencias implícitas del renderer.
- `CONSENTIMIENTO_DATOS_PERSONALES` debe quedar fuera del PDF final cliente.
- `PSICOMETRICO` y `PSICOMETRICO_JSON` se clasifican explícitamente como fuera de alcance del PDF final cliente en esta fase.
- La funcionalidad psicométrica permanece viva en el sistema, pero no participa en `Armados` ni en el snapshot del PDF cliente por ahora.

### H. Información que debe quedar deliberadamente fuera del PDF cliente

Aunque exista en el sistema, no debe formar parte del PDF final para cliente salvo decisión futura explícita:

- aviso de privacidad y evidencia de consentimiento
- metadatos de sesión de visita:
  - `_privacyAcceptedAt`
  - `_sessionStartedAt`
  - `_sessionStartGps`
  - `_sessionEndedAt`
  - `_sessionEndGps`
  - `_deviceInfo`
- identidad del encuestador
- firma del encuestador
- comentarios internos del proceso
- `candidateComments` internos
- trazas `auditTrail`
- notas IA marcadas para uso interno

### I. Conclusión de cobertura previa a implementación

No se debe iniciar implementación final del módulo `Armados` sin asumir estas reglas:

1. El snapshot del Armado debe consolidar datos de:
   - `candidates`
   - `candidates.perfilDetalle`
   - `candidates.dictamenLaboral`
   - `workHistory`
   - bloques del `process`
   - `documents`

2. El renderer debe aceptar secciones suficientes para no excluir por diseño:
   - campos del perfil candidato
   - historial laboral detallado
   - visita domiciliaria completa
   - documentos/evidencias relevantes

3. Lo que se excluya del PDF cliente debe quedar explicitado por regla, no por olvido técnico.

4. La implementación puede arrancar por fases, pero el esquema de snapshot y el diseño del renderer deben nacer preparados para cubrir toda la información anterior.

5. Excepción vigente de alcance: psicométricos se omiten deliberadamente del Armado actual y no deben considerarse un faltante funcional en esta primera fase.

---

## Modelo de Versionado Requerido

### Entidad sugerida

Crear una entidad dedicada para versiones del PDF final del cliente, en lugar de reutilizar únicamente `documents`.

Nombre tentativo:

- `processReportVersions`

Campos mínimos sugeridos:

- `id`
- `processId`
- `versionNumber`
- `status` = `draft | published | archived`
- `title` opcional
- `sections` JSON con las secciones marcadas
- `editorialSnapshot` JSON inmutable
- `previewStoragePath` o referencia equivalente al HTML de revisión
- `storagePath`
- `url` o referencia al archivo
- `rendererVersion` o huella del renderer
- `assetManifest` JSON opcional con mapas, fotos y anexos enlazados
- `generatedByUserId`
- `generatedAt`
- `publishedByUserId`
- `publishedAt`
- `replacedByVersionId` opcional

### Esquema técnico propuesto

Tabla nueva sugerida: `processReportVersions`

Campos propuestos:

- `id` INT PK autoincremental
- `processId` INT not null
- `versionNumber` INT not null
- `status` ENUM `draft | published | archived`
- `title` VARCHAR(255) nullable
- `sections` JSON not null
- `editorialSnapshot` JSON not null
- `previewStoragePath` TEXT nullable
- `storagePath` TEXT not null
- `url` TEXT not null
- `rendererVersion` VARCHAR(120) nullable
- `assetManifest` JSON nullable
- `mimeType` VARCHAR(100) nullable
- `generatedByUserId` INT nullable
- `generatedByName` VARCHAR(255) nullable
- `generatedAt` TIMESTAMP not null
- `publishedByUserId` INT nullable
- `publishedAt` TIMESTAMP nullable
- `replacedByVersionId` INT nullable
- `notes` TEXT nullable

Índices sugeridos:

- índice por `processId`
- índice compuesto por `processId + status`
- índice único lógico por `processId + versionNumber`

Forma del campo `sections`:

```json
{
  "generales": true,
  "documentos": false,
  "investigacionLaboral": true,
  "investigacionLegal": false,
  "semanasCotizadas": true,
  "buroCredito": false,
  "visitaDomiciliaria": true,
  "observacionesConclusion": true
}
```

Forma mínima sugerida del campo `editorialSnapshot`:

```json
{
  "meta": {
    "processId": 123,
    "versionNumber": 4,
    "generatedAt": "2026-03-20T18:45:00.000Z",
    "rendererVersion": "armado-html-v1"
  },
  "layout": {
    "activeSections": [
      "generales_candidato",
      "investigacion_laboral",
      "visita_domiciliaria",
      "observaciones_conclusion"
    ]
  },
  "content": {
    "candidate": {},
    "process": {},
    "workHistory": [],
    "documents": []
  }
}
```

### Regla de publicación

- Puede haber múltiples versiones `draft`.
- Solo una versión puede estar en `published` por proceso.
- Al publicar una nueva versión:
  - la anterior `published` pasa a `archived`
  - la nueva pasa a `published`

### Razón para no reutilizar `documents`

La tabla `documents` actual sirve para almacenar archivos, pero no expresa de forma suficiente:

- número de versión
- estado editorial del PDF
- secciones incluidas
- reemplazo entre versiones
- publicación controlada hacia cliente

Por eso debe conservarse `documents` como inventario de archivos generales, mientras `processReportVersions` gobierna el ciclo de vida del entregable cliente.

---

## Comportamiento Esperado

### Generar borrador

Cuando la analista presiona `Generar borrador`:

- se toma el snapshot de las secciones marcadas
- se genera el preview HTML de esa versión
- se genera un nuevo PDF a partir del mismo contenido editorial
- se crea una nueva versión `draft`
- no se expone al cliente

Adicionalmente:

- el PDF debe renderizarse usando un snapshot de datos al momento de la generación
- el conjunto de checkboxes seleccionados debe almacenarse junto a la versión
- la URL generada debe quedar vinculada a esa versión, no al proceso genérico
- la versión debe quedar marcada como `versión en revisión` hasta que otra draft la sustituya o sea publicada

### Publicar para cliente

Cuando la analista presiona `Publicar para cliente`:

- la versión seleccionada pasa a `published`
- cualquier versión previa publicada pasa a `archived`
- el cliente solo verá esta última versión publicada

Adicionalmente:

- si la versión publicada ya fue compartida y luego se publica una nueva, la anterior sigue existiendo en historial pero deja de ser la versión vigente
- la acción de publicación debe requerir permisos internos de edición de procesos
- la publicación debe apuntar a la misma versión revisada, sin cambiar snapshot ni selección de secciones

### Regenerar después de cambios

Si una analista modifica selección o contenido y genera de nuevo:

- se crea una nueva versión
- la anterior permanece en historial
- no se pierde el archivo viejo

---

## Auditoría Requerida

Registrar eventos mínimos:

- `process_report_pdf_generated`
- `process_report_pdf_published`
- `process_report_pdf_archived`

Evento adicional recomendado:

- `process_report_pdf_downloaded_by_client`

Detalles mínimos por evento:

- `processId`
- `versionNumber`
- `sections`
- `generatedBy` o `publishedBy`
- `timestamp`

---

## Impacto en Portal Cliente

El portal del cliente debe dejar de consumir cualquier PDF generado de forma inmediata.

Comportamiento requerido:

- Si no existe una versión `published`, el cliente no debe ver enlace de PDF final.
- Si existe una versión `published`, solo se muestra esa versión.
- El cliente nunca debe ver borradores ni historial completo.

Estado actual a corregir:

- hoy el portal cliente recupera directamente el PDF de estudio mediante la acción existente de generación/recuperación
- ese comportamiento debe cambiar para que la pantalla cliente solo consulte la versión publicada en `processReportVersions`

---

## Diseño Técnico por Capa

### A. Base de datos

Cambios requeridos en `drizzle/schema.ts`:

- agregar tabla `processReportVersions`
- exportar tipos `ProcessReportVersion` e `InsertProcessReportVersion`

Cambios requeridos en acceso a datos `server/db.ts`:

- `getProcessReportVersions(processId)`
- `getLatestPublishedProcessReportVersion(processId)`
- `createProcessReportVersion(data)`
- `publishProcessReportVersion(id, processId, actor)`
- `getNextProcessReportVersionNumber(processId)`

### B. Backend / routers

#### Nuevo router sugerido

Crear `server/routers/processReportVersions.ts` y montarlo en el router principal.

Endpoints mínimos:

- `listByProcess({ processId })`
  - interno
  - devuelve historial de versiones

- `generateDraft({ processId, sections })`
  - interno
  - obtiene snapshot de datos del proceso
  - persiste `editorialSnapshot`
  - genera preview HTML versionado
  - genera el PDF desde el mismo contenido editorial
  - crea versión `draft`

- `getDraftPreview({ versionId })`
  - interno
  - devuelve la vista HTML de la versión en revisión seleccionada

- `publish({ versionId, processId })`
  - interno
  - archiva la versión publicada anterior
  - marca la nueva como `published`

- `getPublishedForClient({ processId })`
  - interno con validación de ownership para rol cliente o token cliente
  - devuelve solo la versión publicada vigente

#### Ajustes requeridos a routers existentes

- `server/routers/surveyorPortal.ts`
  - dejar de usarse como endpoint principal para recuperación cliente del PDF final
  - puede mantenerse para generación técnica interna o reutilizar parte del renderer

- `server/routers/clientPortal.ts`
  - no debe exponer borradores
  - debe limitarse a versiones publicadas cuando haya acceso al PDF final

- `server/routers/processes.ts`
  - puede quedar como punto de apoyo para snapshot consolidado si se decide centralizar allí la lectura de datos

### C. Generador PDF

Actualizar `server/utils/estudiosocioPdf.ts` para que acepte:

- `editorialSnapshot` como entrada principal
- `sections` como configuración de renderizado

Firma objetivo sugerida:

```ts
generarEstudioSocioeconomicoPDF({
  candidate,
  process,
  workHistory,
  sections,
  visitDetail,
  internalSummary,
})
```

Reglas:

- solo renderiza secciones activas
- mantiene un layout consistente aunque falten bloques
- nunca incluye aviso de privacidad
- nunca incluye borradores internos no seleccionados
- debe poder resolver anclas internas, paginación y enlaces externos de forma consistente con el preview HTML

Renderer recomendado:

- usar una estrategia HTML-first con renderización a PDF en entorno headless para maximizar fidelidad visual entre revisión y entregable final

### D. Frontend interno

Archivo principal afectado: `client/src/pages/ProcesoDetalle.tsx`

Agregar un módulo visual en expediente o en visitas con:

- checkboxes por sección
- botón `Generar borrador`
- tabla de historial de versiones
- acción `Publicar para cliente`
- acción `Abrir borrador`
- estado visible de `versión en revisión`
- diferenciación clara entre `borrador activo`, `borradores históricos` y `publicado vigente`

Datos visibles por fila sugeridos:

- versión
- estado
- fecha de generación
- generó
- fecha de publicación
- secciones incluidas

### E. Frontend cliente

Archivo principal afectado: `client/src/pages/ClienteProcesoDetalle.tsx`

Cambios requeridos:

- eliminar recuperación directa de cualquier PDF generado por backend
- consultar únicamente la versión publicada
- si no existe versión publicada, ocultar botón o mostrar estado `Pendiente de publicación`

---

## Fases de Implementación Recomendadas

### Fase 1

- crear tabla y acceso a datos de versiones
- crear endpoints de `listByProcess` y `publish`
- mover visibilidad cliente a versión publicada

### Fase 2

- agregar configurador con checkboxes en expediente
- generar borradores y listarlos

### Fase 3

- terminar integración del renderer por secciones
- mejorar vista previa y UX de historial

---

## Decisiones de Producto ya Cerradas

- sin presets automáticos
- selección manual solo por checkboxes
- el aviso de privacidad es documento separado
- el cliente no ve PDFs hasta publicación explícita
- el PDF nuevo no debe borrar el anterior

---

## Alcance Técnico Inicial

### Frontend interno

- Configurador de checkboxes en expediente del proceso
- Lista de versiones generadas
- Acciones `Generar borrador` y `Publicar para cliente`

### Backend

- endpoint para generar borrador con secciones seleccionadas
- endpoint para listar versiones por proceso
- endpoint para publicar una versión
- endpoint cliente que solo entregue versión `published`

### PDF

- el generador debe aceptar `sections` como input
- renderizar únicamente los bloques marcados
- mantener estructura editorial consistente

---

## Archivos Probablemente Afectados

- integra-rh-manus/client/src/pages/ProcesoDetalle.tsx
- integra-rh-manus/client/src/pages/ClienteProcesoDetalle.tsx
- integra-rh-manus/server/routers/surveyorPortal.ts
- integra-rh-manus/server/routers/processes.ts
- integra-rh-manus/server/utils/estudiosocioPdf.ts
- integra-rh-manus/server/db.ts
- integra-rh-manus/drizzle/schema.ts

---

## Riesgos a Cuidar

- exponer por error un borrador al cliente
- sobrescribir una versión previa en lugar de archivarla
- mezclar secciones internas con entregables al cliente
- permitir selección libre sin snapshot, causando PDFs inconsistentes respecto al historial
- permitir que el preview HTML y el PDF diverjan visual o narrativamente
- perder validez de enlaces a mapa, fotos o evidencias después de publicar

---

## Criterios de Aceptación

- La analista puede marcar manualmente las secciones a incluir.
- El sistema genera una versión `draft` con snapshot inmutable, preview HTML y PDF coherentes entre sí.
- El sistema genera un PDF en borrador sin hacerlo visible al cliente.
- Si se genera otro PDF, el anterior permanece en historial.
- Solo una versión publicada puede estar visible al cliente.
- El cliente no puede ver borradores.
- El aviso de privacidad no aparece dentro del PDF final del estudio.
- El índice del PDF solo incluye secciones realmente presentes y muestra su página inicial.
- El mapa estático y las imágenes enlazables abren su destino original sin romper la experiencia impresa.
- El documento conserva consistencia visual aunque falten secciones opcionales intermedias.
