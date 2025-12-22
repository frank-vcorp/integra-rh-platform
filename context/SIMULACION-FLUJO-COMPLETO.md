# SIMULACIÓN – FLUJO COMPLETO DEL SISTEMA INTEGRA RH

> Documento interno para revisión funcional.  
> Escenario simulado de punta a punta con los módulos actuales, incluyendo el nuevo flujo self‑service del candidato.

---

## 1. Escenario base de la simulación

- **Cliente:** Sycom Demo Corp.
- **Plaza / CEDI:** CDMX – Sucursal Demo.
- **Puesto:** Gerente de Operaciones Demo.
- **Candidato:** “Mariana Rodríguez Demo”.
- **Roles involucrados:**
  - *Recepcionista* (rol: Recepción).
  - *Analista* (rol: Analista).
  - *Administrador* (rol: Admin).
  - *Candidato* (self‑service vía enlace).

El objetivo es seguir el flujo real que las chicas usarían:

1. Recepción de una nueva vacante.
2. Alta de proceso y candidato.
3. Envío de enlace de pre‑registro al candidato.
4. Captura self‑service desde el celular.
5. Revisión del analista y complementación de investigación laboral.
6. Generación de dictamen y cierre del proceso.
7. Visualización en dashboard y listados.

En cada etapa se anotan observaciones y posibles huecos.

---

## 2. Recepción de la vacante y alta de proceso

### 2.1. Recepcionista – Alta o selección de cliente

1. La recepcionista inicia sesión y llega al **Dashboard**.
2. Desde el menú lateral entra a **Clientes**.
3. Busca “Sycom Demo Corp” usando:
   - El buscador local de la lista de clientes, o
   - El buscador global (barra superior).
4. Si el cliente ya existe:
   - Lo selecciona de la lista.
5. Si no existe:
   - Usa el botón **“Nuevo Cliente”** y captura:
     - Nombre comercial, ubicación, contacto, teléfonos, email.
     - Define al menos una **Plaza / CEDI** (tabla `clientSites`):
       - Ejemplo: “CDMX – Sucursal Demo”.

**Observación:**  
La normalización de plazas ya está soportada vía `clientSites` y se usa luego en candidatos y procesos. La UI actual lo refleja bien, pero la gestión de muchas plazas podría requerir filtros cuando haya muchas sedes.

### 2.2. Recepcionista – Alta rápida del proceso

1. Desde **Procesos** o desde un flujo rápido del Dashboard, la recepcionista da clic en **“Nuevo Proceso”**.
2. El formulario de alta rápida le permite:
   - Seleccionar el **Cliente** (Sycom Demo Corp).
   - Seleccionar o capturar el **Puesto**.
   - Seleccionar la **Plaza / CEDI** (de las definidas en el cliente).
   - Capturar **Medio de recepción**, **Fecha de recepción**, etc.
3. Se genera la **clave del proceso** (ejemplo: `DEM-2025-001`) y queda con estatus “En recepción” o similar.

**Observación:**  
El flujo rápido para proceso está bien encaminado. La clave y el tipo de producto (ILA / ESE Local, etc.) ya se reflejan en la lista con colores por estatus. No se detectan huecos importantes en esta parte.

---

## 3. Alta del candidato asociado al proceso

### 3.1. Recepcionista – Candidato desde el proceso

1. Desde el detalle del proceso recién creado, la recepcionista ubica el bloque **“Información”**:
   - Cliente, Puesto, Plaza.
   - Medio de recepción.
   - Estatus del proceso.
2. Usa el flujo para asociar o crear candidato:
   - Si el candidato ya existe, lo selecciona.
   - Si es nuevo, usa el formulario rápido:
     - **Nombre completo**, **email**, **teléfono**, **medio de recepción**, **cliente**, **puesto**, **plaza**.
3. El candidato queda ligado al proceso y aparece en el módulo **Candidatos**.

**Observación:**  
En este punto el sistema ya tiene todo lo necesario para trabajar: cliente, plaza, puesto, proceso y candidato ligados. El único “pero” es que aún no se ven en la ficha del candidato todos los campos detallados del formato unificado (se agrega en el siguiente paso vía self‑service).

---

## 4. Generación del enlace self‑service y envío al candidato

### 4.1. Analista / Recepcionista – Generar enlace

1. Un usuario interno entra a **Candidatos** y abre el detalle de “Mariana Rodríguez Demo”.
2. En el recuadro **“Captura inicial del candidato”** (bajo Consentimiento de Datos) ve que el estado está en `Pendiente`.
3. Hace clic en **“Generar enlace de pre‑registro”**:
   - El backend crea un token en `candidateSelfTokens` con vigencia de 6 horas.
   - Se arma la URL pública:
     - `https://integra-rh.web.app/pre-registro/:token`.
4. El sistema muestra la URL y la copia al portapapeles para que la recepcionista la envíe por WhatsApp / correo al candidato.

**Observación:**  
Esta parte ya está implementada y probada. La caducidad de 6 horas se respeta en el backend. No se detectan huecos funcionales relevantes aquí.

---

## 5. Candidato – Flujo self‑service completo (simulado)

El candidato abre el enlace en su celular. El sistema valida el token y carga su información básica más cualquier empleo que ya exista.

### 5.1. Paso 1 – Datos personales y de contacto

Campos que el candidato ve y puede capturar/editar:

- Puesto solicitado.
- CEDI / Plaza.
- Fecha de nacimiento.
- Lugar de nacimiento.
- Ciudad donde vive actualmente.
- NSS (cuando lo agreguemos en UI interna).
- CURP.
- RFC.
- Teléfono celular (obligatorio).
- Teléfono casa.
- Teléfono recados.
- Correo electrónico (obligatorio).

**Simulación:**  
El candidato llena todo desde el celular sin problemas. La validación mínima (email/teléfono + primer empleo) funciona. El autosave guarda cambios periódicamente (no se pierde información al recargar).

**Laguna menor:**  
El campo de NSS ya está contemplado en el modelo (`perfilDetalle.generales.nss`), pero aún no se expone en esta pantalla; sería bueno sumarlo en este bloque.

### 5.2. Paso 2 – Domicilio

Campos:

- Calle y número (texto).
- Interior (opcional).
- Colonia.
- Municipio / Ciudad.
- Estado.
- Código Postal.

**Simulación:**  
El candidato captura su domicilio. Toda la estructura se guarda en `perfilDetalle.domicilio`. El autosave respeta estos campos.

### 5.3. Paso 3 – Redes sociales

Campos opcionales:

- Facebook.
- Instagram.
- Twitter / X.
- TikTok.

**Simulación:**  
El candidato puede dejar estos campos en blanco o llenarlos. No hay validaciones estrictas (lo cual es correcto para no frenar el flujo).

### 5.4. Paso 4 – Entorno familiar

Campos:

- Estado civil.
- Fecha de matrimonio / unión (si aplica).
- ¿Pareja de acuerdo con el trabajo?
- ¿Esposa embarazada?
- Hijos (edades/descripcion).
- ¿Quién cuida a los hijos?
- ¿Dónde viven los cuidadores?
- Pensión alimenticia (da o recibe).
- Tipo de vivienda.

**Simulación:**  
El candidato llena campos básicos; algunos pueden quedar en blanco. La información queda agrupada en `perfilDetalle.situacionFamiliar`.

### 5.5. Paso 5 – Pareja / noviazgo

Campos:

- ¿Tiene novio(a)?
- Nombre de la pareja.
- Ocupación.
- Domicilio.
- ¿Apoyo económico mutuo?
- ¿Negocio en conjunto?

**Simulación:**  
Se capturan solo si aplican; en caso contrario se dejan vacíos. Se guardan en `perfilDetalle.parejaNoviazgo`.

### 5.6. Paso 6 – Situación económica y antecedentes

Campos:

- ¿Tiene deudas?
- Institución de la deuda.
- ¿Le han dicho que está en buró de crédito?
- ¿Ha sido sindicalizado?
- ¿Ha estado afianzado?
- Accidentes viales previos (texto).
- Accidentes de trabajo previos (texto).

**Simulación:**  
El candidato puede declarar información básica. Se almacena en `perfilDetalle.financieroAntecedentes`. No hay aún validación cruzada con módulos de buró/visitas (eso será trabajo posterior del analista).

### 5.7. Paso 7 – Contacto de emergencia

Campos:

- Nombre completo.
- Parentesco.
- Teléfono.

**Simulación:**  
El candidato captura un contacto. Se guarda en `perfilDetalle.contactoEmergencia`.

### 5.8. Paso 8 – Historial laboral (básico)

Por cada empleo:

- Empresa (obligatoria en el primer empleo).
- Puesto.
- Fecha de inicio.
- Fecha de fin.
- Tiempo trabajado (texto libre, ej. “2 años 3 meses”).
- Checkbox **“Este es mi empleo actual”**:
  - Si está marcado → el sistema guarda `fechaFin` vacía.

El candidato puede agregar varios empleos (`Agregar otro empleo`). El autosave marca cada registro nuevo como:

- `workHistory.capturadoPor = "candidato"`.
- `estatusInvestigacion = "en_revision"`.
- `resultadoVerificacion = "pendiente"`.

**Simulación:**  
Se agregan 3 empleos:

1. Empleo actual marcado como tal.
2. Empleo previo con fechas inicio/fin.
3. Empleo más antiguo con solo tiempo trabajado.

Todo se guarda correctamente y aparece luego en la ficha de Historial Laboral con la bandera de “Capturado por CANDIDATO”.

**Laguna prevista:**  
La parte declarativa del candidato (empresa, giro, actividades) ya está, pero la UI interna aún no explota todos los campos del JSON `investigacionDetalle`. Esto se maneja en el formulario telefónico del analista más adelante.

### 5.9. Paso 9 – Aviso de privacidad y envío

El candidato:

1. Lee el aviso de privacidad (texto scrollable).
2. Marca la casilla de aceptación.
3. Presiona **“Enviar datos”**.

Backend:

- Valida token y vigencia.
- Actualiza `candidates.selfFilledStatus = 'recibido'` y `selfFilledAt`.
- Crea o actualiza un registro en `candidate_consents` con `is_given = true`.
- Marca el token como usado `usedAt = NOW()`.
- Inserta un comentario automático en el proceso más reciente:
  - “El candidato completó su formulario de datos iniciales vía self‑service.”

Frontend:

- Muestra mensaje de éxito y sugiere cerrar la ventana.

**Observación importante:**  
Aquí ya logramos el objetivo principal: el candidato hizo la mayoría de la captura, reduciendo mucho el trabajo manual de las chicas.

---

## 6. Analista – Revisión y complementación

### 6.1. Revisión de la captura inicial

1. El analista abre el detalle del candidato.
2. En el recuadro **“Captura inicial del candidato”** ve:
   - Estado: `Recibido`.
   - Fecha/hora de envío.
3. Revisa:
   - Bloque de **Información General** del candidato.
   - Historial Laboral:
     - Cada empleo indica si fue “Capturado por CANDIDATO” o “ANALISTA”.
4. Si todo está correcto, presiona el botón **“Marcar como revisada”**:
   - `selfFilledStatus` pasa a `revisado`.
   - `selfFilledReviewedBy` y `selfFilledReviewedAt` se actualizan con usuario y fecha.

**Laguna:**  
No todos los apartados de `perfilDetalle` se muestran aún visualmente en la ficha del candidato (p.ej. redes sociales, entorno familiar, financiero). Sería deseable agregar un panel de “Perfil extendido” para que el analista no tenga que ir a la base o a JSON.

### 6.2. Investigación laboral telefónica por empleo

1. Desde el historial laboral, el analista abre el formulario de **Investigación laboral** de un empleo.
2. Captura:
   - Datos telefónicos validados: fechas, puesto real, motivo de salida, incidencias, desempeño, recomendación, etc.
   - Estos campos se guardan estructurados en `workHistory.investigacionDetalle` y `desempenoScore`.
3. Marca cada empleo con estatus de investigación (en revisión / revisado / terminado).

**Observación:**  
La separación “capturado por candidato” vs “validado por analista” está soportada por:

- `workHistory.capturadoPor`.
- `workHistory.investigacionDetalle` para la parte de validación.

Falta aún una vista consolidada que compare claramente “declarado vs validado” en la misma tarjeta, pero la base técnica ya está.

### 6.3. Dictamen y cierre del proceso

1. Con todos los empleos investigados, el analista vuelve al detalle del **Proceso**.
2. Revisa:
   - Bloques de investigación laboral, legal, visita domiciliaria, etc. (según aplique).
3. Asigna:
   - **Calificación final** (Recomendable / Con reservas / No recomendable).
   - **Estatus del proceso** (En verificación, En dictamen, Finalizado, Entregado…).
4. Si procede, adjunta o genera el archivo de dictamen.

**Observación:**  
Los colores de filas por estatus y los indicadores en Procesos ayudan a identificar rápidamente los casos críticos (pendientes, finalizados, entregados). Esta parte está bien alineada con lo que pidieron en reuniones.

---

## 7. Vista global – Listados y dashboard

### 7.1. Listados (Clientes, Candidatos, Procesos, Usuarios, etc.)

- Se verificó que:
  - Las filas alternan colores suaves, lo que mejora la lectura.
  - En Procesos, la columna **Plaza** ya está integrada y reordenada.
  - En Candidatos, se quitó la columna Email del listado para reducir ruido visual (se conserva dentro del detalle).
  - El scroll horizontal ahora lo maneja el navegador, no un frame interno (más cómodo en desktop).

**Pendiente leve:**  
En pantallas muy estrechas, las tablas largas siguen siendo retadoras, pero al menos el comportamiento de scroll es consistente.

### 7.2. Buscador general

- El buscador superior ahora consulta:
  - Clientes.
  - Candidatos.
  - Procesos.
  - Encuestadores.
- Se corrigió el error de JavaScript que se presentaba (`Cannot access 'be' before initialization`).

**Observación:**  
El buscador aún no hace corrección ortográfica “inteligente”; delegamos la sugerencia a los correctores del navegador y al uso de mayúsculas/minúsculas normalizadas. Para el equipo actual esto es suficiente.

---

## 8. Hallazgos, lagunas y sugerencias

### 8.1. Lo que ya está sólido

- Flujo de **creación de procesos** y ligue con clientes / plazas.
- Alta y asociación de **candidatos** a procesos.
- Generación y uso de **enlace self‑service** con caducidad y autosave.
- Registro y marcado del **consentimiento de datos** vía self‑service.
- Distinción clara entre empleos **capturados por el candidato** y **por el analista**.
- Esquema de roles y permisos internos básico (Admin, Recepción, Analista, Superadmin).
- Mejora visual de listados (colores alternos, scroll horizontal mejorado).

### 8.2. Lagunas funcionales detectadas

1. **Visualización del perfil extendido del candidato**
   - El candidato llena muchos datos (redes sociales, entorno familiar, financiero) que hoy quedan en `perfilDetalle` pero no se muestran completos en la UI interna.
   - Sugerencia: agregar un panel “Perfil extendido” en `CandidatoDetalle` que muestre estos datos de forma ordenada, solo para roles autorizados.

2. **NSS en el flujo público**
   - El formato unificado lo considera, el modelo ya tiene el campo, pero el formulario self‑service todavía no lo expone.
   - Sugerencia: añadirlo en el bloque de datos personales.

3. **Comparación “declarado vs validado”**
   - A nivel de estructura ya podemos guardar ambas caras, pero al analista todavía no se le muestra una comparativa clara en un mismo lugar.
   - Sugerencia: en la vista de cada empleo, mostrar:
     - Columna “Declarado” (candidato).
     - Columna “Validado” (referencia telefónica).

4. **Historial de cambios (audit log) específico de self‑service**
   - La base de `audit_logs` existe, pero el flujo self‑service aún no registra de forma exhaustiva cada autosave/cambio con detalle de campos.
   - Sugerencia: instrumentar `candidateSelf.autosave` y `candidateSelf.submit` para crear registros detallados, lo que ayudaría en auditorías futuras.

5. **Carga de documentos por el candidato**
   - Está contemplado en el diseño conceptual, pero todavía no se implementó en la UI self‑service.
   - Sugerencia: definir un conjunto mínimo de documentos (INE, comprobante de domicilio, CV) y habilitar subida controlada.

### 8.3. Riesgos menores

- **Formularios largos en móvil:**  
  Aunque ya se organizaron por secciones, la cantidad de campos es alta. El autosave y el texto claro ayudan, pero conviene probar con usuarios reales para ajustar textos, agrupaciones y tal vez plegar secciones menos críticas.

- **Dependencia del token y caducidad:**  
  Si el candidato no termina en 6 horas, necesitará un nuevo enlace. Esto es correcto por seguridad, pero hay que asegurarse de que el equipo tenga claro el procedimiento para regenerarlo.

---

## 9. Conclusión de la simulación

La simulación muestra que:

- El sistema ya soporta un flujo prácticamente completo “de punta a punta”:
  - Desde la recepción de la vacante.
  - Pasando por la captura automática del candidato.
  - Hasta la investigación laboral, dictamen y cierre.
- La mayor parte de la carga manual de captura se trasladó al candidato, cumpliendo el objetivo de reducir trabajo repetitivo para las chicas.
- La trazabilidad básica (quién capturó qué, y cuándo) está respaldada por:
  - `capturadoPor` en historial laboral.
  - `selfFilledStatus` y sus timestamps.
  - Comentarios automáticos en procesos.

Las principales oportunidades de mejora ya no son de “falta de datos”, sino de:

- Presentar mejor la información que ya capturamos (perfil extendido y comparativas).
- Afinar el seguimiento con auditoría detallada y potencial uso de IA para resúmenes.

Este documento puede servir como guía para que un agente automatizado en el navegador ejecute pruebas de punta a punta y valide que cada paso se comporta como se describe.

