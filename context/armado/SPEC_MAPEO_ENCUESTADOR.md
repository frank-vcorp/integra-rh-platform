# 📱 SPEC-MAP: App del Encuestador (Captura en Campo)

**Objetivo:** Definir con exactitud la lista de campos, etiquetas originales y tipos de inputs (UI) que conformarán la aplicación web móvil (PWA) de los encuestadores. Toda la data recopilada aquí se inyectará en formato JSON dentro de `processes.visitaDetalle`.

---
## ⚙️ ARQUITECTURA TÉCNICA DEL PORTAL DEL ENCUESTADOR

### A. Generación del Link (`/e/[token]`)

- El link se genera **en el momento exacto que oficina presiona "Programar"** (no antes, no después).
- Al hacer clic en "Programar", el servidor crea el token y lo devuelve en la misma respuesta — de forma que los botones de **WhatsApp**, **Google Calendar** e **ICS** que aparecen en el panel ya llevan el link embebido en su contenido.
- Se crea un registro en la tabla `surveyorTokens` con:
  - `token` — UUID único e irrepetible
  - `processId` — proceso al que pertenece
  - `assignedTo` — encuestador asignado (opcional)
  - `status` — `PENDIENTE` → `EN_CURSO` → `COMPLETADO`
  - `expiresAt` — fecha límite de validez del link (ej: 7 días)
- El link resultante es: `https://app.sinergiarhmexico.com/e/[token]`
- Si el token ya fue completado o expiró, la app muestra pantalla de error explicativa.

#### Payload de los botones de compartir (incluyen el link automáticamente):

> ⚠️ **Regla de privacidad:** Los mensajes compartidos NO deben exponer datos internos de Sinergia (IDs de proceso, cliente, puesto, folio, etc.). Solo se incluye lo que el encuestador necesita para llegar y presentarse.

| Botón | Contenido generado |
| :--- | :--- |
| **WhatsApp** | `"Hola [nombre encuestador], tienes una visita agendada:\n📅 [fecha y hora]\n👤 Candidato: [nombre completo]\n📞 [teléfono candidato]\n📍 [dirección]\n🕐 Horario: [horario de la visita]\n📝 Observaciones: [observaciones]\n\nFormulario:\nhttps://app.sinergiarhmexico.com/e/[token]"` |
| **Google Calendar** | Evento con título `"Visita domiciliaria"`, descripción con nombre, teléfono, dirección, horario, observaciones y link. Sin datos internos. |
| **Descargar .ics** | Archivo con los mismos datos del evento + link en el campo `DESCRIPTION`. Sin datos internos. |

> **Pendiente (siguiente sesión):** Revisar y afinar el texto exacto de los mensajes compartidos con el usuario antes de implementar.

### B. Trazabilidad de Sesión (Metadatos automáticos)

Estos campos se guardan **automáticamente** — el encuestador no los ve ni los edita:

| Campo en `visitaDetalle` | Cuándo se captura | Descripción |
| :--- | :--- | :--- |
| `_privacyAcceptedAt` | Al marcar el checkbox del Aviso | Timestamp ISO de aceptación del Aviso de Privacidad |
| `_sessionStartedAt` | Al presionar **"Comenzar encuesta"** | Timestamp ISO de inicio del llenado |
| `_sessionStartGps` | Al presionar **"Comenzar encuesta"** | `{ lat, lon, accuracy }` — coordenadas GPS al arrancar |
| `_sessionEndedAt` | Al presionar **"Enviar y Finalizar"** | Timestamp ISO de cierre del formulario |
| `_sessionEndGps` | Al presionar **"Enviar y Finalizar"** | `{ lat, lon, accuracy }` — coordenadas GPS al guardar |
| `_deviceInfo` | Al abrir la app | `{ userAgent, platform }` — info del dispositivo usado |

> **Regla:** Si el encuestador NO tiene GPS activo al iniciar, la app muestra un aviso de advertencia pero **no bloquea** el formulario (el GPS puede estar desactivado en zonas de señal débil).

### C. Modo Offline — Guardado Local Permanente

La app debe funcionar **sin internet**. Estrategia:

1. **Auto-guardado en IndexedDB** (no localStorage, para soportar objetos grandes y fotos como base64):
   - Cada cambio de campo dispara un guardado local automático (debounce de 2 segundos).
   - Indicador visual en la UI: `"💾 Guardado localmente"` / `"🔴 Sin conexión — datos guardados en este dispositivo"`.

2. **Fotos** (§3 y §11): Se guardan temporalmente en IndexedDB como base64 mientras no hay internet. Al recuperar señal, se suben a Firebase Storage y se reemplaza el base64 por la URL definitiva.

3. **Sincronización al recuperar internet**:
   - La app detecta el evento `navigator.onLine`.
   - Al reconectarse, **sincroniza automáticamente** los datos pendientes al servidor vía tRPC.
   - El indicador cambia a: `"✅ Sincronizado con el servidor"`.

4. **Prevención de pérdida de datos**:
   - Si el encuestador intenta cerrar la pestaña sin haber sincronizado, el browser muestra el warning nativo `beforeunload`.
   - El token permanece en estado `EN_CURSO` hasta que el servidor confirme la recepción completa.

---
### � 0. AVISO DE PRIVACIDAD (PANTALLA DE ENTRADA)
*Pantalla de bienvenida obligatoria antes de habilitar el formulario. El candidato debe aceptar antes de continuar.*

| Elemento | Tipo | Notas |
| :--- | :--- | :--- |
| Texto del Aviso de Privacidad | `Text Block` (Solo lectura) | Mostrar el contenido completo del documento `"AVISO DE PRIVACIDAD SINERGIA RH"`. Puede mostrarse como texto scrolleable o como enlace al PDF. |
| `"He leído y acepto el Aviso de Privacidad"` | `Checkbox` obligatorio | El botón **"Comenzar encuesta"** permanece **deshabilitado** hasta que se marque este checkbox. |
| Timestamp de aceptación | `Auto` (invisible) | Se registra automáticamente la fecha/hora de aceptación en `visitaDetalle._privacyAcceptedAt`. No editable. |

> **Regla legal (LFPDPPP):** El consentimiento debe obtenerse *antes* de capturar cualquier dato personal. Esta pantalla garantiza el cumplimiento. El checkbox de aceptación se guarda en BD como evidencia de consentimiento informado.

---

### �📍 1. UBICACIÓN Y DOMICILIO
*Sección apoyada fuertemente por el GPS del dispositivo para validar la presencia del encuestador.*

| Etiqueta Orig. (Excel) | Tipo de Campo (UI en Móvil) | Notas / Ayuda en App |
| :--- | :--- | :--- |
| **N/A** | `Botón Acción` | **"Obtener ubicación GPS"** (Captura Lat/Lon en fondo). |
| `"DOMICILIO (CALLE Y ENTRE CALLES)"` | `Textarea` (Texto Largo) | Se puede pre-llenar con el GPS o datos previos. |
| `"C.P:"` | `Number` (Teclado numérico) | |
| `"COLONIA Y MUNICIPIO:"` | `Text` (Texto corto) | |
| `"ESTADO:"` | `Text` o `Select` | |

---

### 🎓 2. INFORMACIÓN ACADÉMICA
*Nivel de estudios del candidato comprobable.*

| Etiqueta Orig. (Excel) | Tipo de Campo (UI en Móvil) | Notas / Ayuda en App |
| :--- | :--- | :--- |
| `"ÚLTIMO GRADO DE ESTUDIOS:"` | `Select` | (Primaria, Secundaria, Preparatoria, Licenciatura, etc.) |
| `"INSTITUCIÓN:"` | `Text` (Texto corto) | Nombre de la escuela/universidad |
| `"CIUDAD:"` | `Text` (Texto corto) | Ciudad de la institución académica |
| `"PERÍODO:"` | `Text` (Texto corto) | Años de inicio y fin |
| `"DOCUMENTO OBTENIDO:"` | `Select` | (Certificado, Título, Carta Pasante, Trunco, Ninguno) |
| `"(DOCUMENTO PRESENTADO Y FOLIO)"` | `Text` (Texto corto) | Número de folio o registro del documento |
| `"ESTUDIA ACTUALMENTE:"` | `Switch` (Sí/No) | Si marca "Sí", abre campos anexos |
| **`"CURSOS O CAPACITACIONES CON VALIDEZ CURRICULAR:"`** | `Repeater` (Array) | Bloque para múltiples cursos |
| ↳ `"INSTITUCIÓN"` | `Text` (Texto corto) | Nombre de la entidad emisora |
| ↳ `"PERIODO"` | `Text` (Texto corto) | Fechas de realización del curso |
| ↳ `"TITULO"` | `Text` (Texto corto) | Nombre del curso o certificación |
| `"EQUIPOS Y MÁQUINAS QUE DOMINA:"` | `TextArea` (Texto largo) | Tipos de máquina o equipo industrial/oficina |
| `"PROGRAMAS QUE DOMINA:"` | `TextArea` (Texto largo) | Paquetería, software, ERP, etc. |
| `"FUNCIONES ADMINISTRATIVAS QUE DOMINA:"` | `TextArea` (Texto largo) | Archivo, contabilidad, nómina, atención |
| `"OTROS CONOCIMIENTOS:"` | `TextArea` (Texto largo) | Idiomas, habilidades extra no formativas |

---

### 📸 3. COTEJO DE DOCUMENTOS (Evidencia Visual)
*El encuestador pide los documentos físicos, marca si los tiene, y la App le abre la cámara para tomar la fotografía.*

| Etiqueta Orig. (Excel) | Tipo de Campo (UI en Móvil) | Notas / Ayuda en App |
| :--- | :--- | :--- |
| `"ACTA DE NACIMIENTO:"` | `Switch` (Sí/No) + `Camera` | Si marca "Sí", botón obligatorio para tomar foto. |
| `"CREDENCIAL DE ELECTOR:"` | `Switch` (Sí/No) + `Camera` | Obligatorio: Foto Frente y Foto Reverso. |
| `"COMPROBANTE DE DOMICILIO:"` | `Switch` (Sí/No) + `Camera` | |
| `"RECIBO DE CFE... A NOMBRE DE:"`| `Text` (Texto corto) | Aparece solo si hay Comprobante de Domicilio. |
| `"PARENTESCO CON EL TITULAR..."` | `Text` (Texto corto) | |
| `"CARTILLA MILITAR:"` | `Switch` (Sí/No) + `Camera` | |
| `"PASAPORTE:"` / `"VISA AMERICANA:"`| `Switch` (Sí/No) + `Camera` | |
| `"CARTAS DE RECOMENDACIÓN:"` | `Switch` (Sí/No) + `Camera` | Permite tomar múltiples fotos. |
| `"CRÉDITO INFONAVIT (NUMERO Y MONTO):"` | `Text` (Texto) + `Camera` | |
| `"TIPO DE SANGRE:"` | `Text` (Texto corto) | Referencia del documento médico |
| `"AFILIADO EN LA AFORE:"` | `Text` (Texto corto) + `Camera` | Nombre de la AFORE |
| `"LICENCIA DE CONDUCIR:"` | `Switch` (Sí/No) + `Camera` | Foto Frente y Reverso |
| `"CERTIFICADO O TITULO RECIBIDO:"` | `Switch` (Sí/No) + `Camera` | Documento que ampara último grado formal |

*(Nota: CURP, RFC y NSS ya vienen validados de oficina, pero el encuestador puede tomarles foto extra dentro de "Otros documentos" si se requiere)*.

---

### 👨‍👩‍👧‍👦 4. DATOS FAMILIARES
*Estructura familiar y personas que comparten o no la vivienda con el candidato (Dynamic Array).*

| Etiqueta Orig. (Excel) | Tipo de Campo (UI en Móvil) | Notas / Ayuda en App |
| :--- | :--- | :--- |
| **N/A** | `Dynamic Array` (Agregar fila) | Matriz para agregar a cada familiar. |
| `"Parentesco"` | `Select` | (Padre, Madre, Esposo/a, Hijo/a, Hermano/a, Otro) |
| `"Nombre"` | `Text` (Texto corto) | Nombre del familiar |
| `"Habita en Domicilio"`| `Switch` (Sí/No) | Indica si habita en el mismo domicilio que el candidato. |
| `"Edad"` | `Number` | |
| `"Escolaridad"` | `Select` | Nivel de estudios del familiar. |
| `"Ocupación"` | `Text` | Ocupación del familiar. |
| `"Lugar de Residencia"`| `Text` | Donde vive el familiar (si no habita en el domicilio). |

**OTRAS PERSONAS QUE HABITAN EN EL DOMICILIO**

| Etiqueta Orig. (Excel) | Tipo de Campo (UI en Móvil) | Notas / Ayuda en App |
| :--- | :--- | :--- |
| **N/A** | `Dynamic Array` (Agregar fila) | Matriz para otras personas habitando en el domicilio. |
| `"Parentesco"` | `Select` | (Padre, Madre, Esposo/a, Hijo/a, Hermano/a, Otro) |
| `"Nombre"` | `Text` (Texto corto) | Nombre de la persona |
| `"Habita en domicilio"`| `Switch` (Sí/No) | |
| `"Edad"` | `Number` | |
| `"Escolaridad"` | `Select` | |
| `"Ocupación"` | `Text` | |
| `"Lugar de Residencia"`| `Text` | |

---

### 🤝 5. ENTREVISTA: DINÁMICA FAMILIAR Y ECONOMÍA OBLIGACIONES
*Preguntas directas que el encuestador le hace al candidato estando en el domicilio.*

| Etiqueta Orig. (Excel) | Tipo de Campo (UI en Móvil) | Notas / Ayuda en App |
| :--- | :--- | :--- |
| `"VIVEN SOLOS CON TU FAMILIA..."`| `Select` (Sí/No) | |
| `"ESPOSA EMBARAZADA?:"` | `Select` (Sí/No/No Aplica) | |
| `"QUIEN CUIDA A TUS HIJOS?"` | `Text` (Texto corto) | |
| `"DONDE VIVE QUIEN CUIDA..."` | `Text` (Texto corto) | |
| `"EDAD DE TUS HIJOS:"` | `Text` (Texto corto) | |
| `"ESTÁ DE ACUERDO TU PAREJA..."` | `Select` (Sí/No/No Aplica) | |
| `"TIENE DEUDAS:"` | `Switch` (Sí/No) | Si marca "Sí", abre el siguiente campo. |
| `"INSTITUCIÓN:"` | `Text` (Texto corto) | |
| `"PENSIÓN ALIMENTICIA?"` | `Switch` (Sí/No) | |
| `"HAZ TRABAJADO EN ESTADOS UNIDOS?"`| `Switch` (Sí/No) | |

---

### 💰 6. REFERENCIAS ECONÓMICAS
*Análisis financiero del hogar: ingresos familiares y egresos mensuales.*

#### 📥 INGRESO FAMILIAR MENSUAL
*Dynamic Array (tabla dinámica con botón "Agregar fila").*

| Etiqueta Orig. (Excel) | Tipo de Campo (UI en Móvil) | Notas / Ayuda en App |
| :--- | :--- | :--- |
| `"NOMBRE"` | `Text` (Texto corto) | Nombre del integrante que aporta. |
| `"PARENTESCO"` | `Select` | Ej: Candidato, Cónyuge, Padre, Madre, Hijo, Otro. |
| `"INGRESO (SUELDO) $"` | `Number` (Moneda) | Sueldo formal mensual del integrante. |
| `"OTROS INGRESOS $"` | `Text` (Texto corto) | Anotar ingreso y actividad informal. Ej: *venta de comida*. |
| `"APORTACIÓN TOTAL MENSUAL"` | `Number` (Auto-calculado) | Suma de `INGRESO (SUELDO) $` + monto implícito en `OTROS INGRESOS $`. |
| `"TOTAL INGRESOS"` | `Number` (Auto-calculado) | Suma de todos los valores de `APORTACIÓN TOTAL MENSUAL`. |

#### 📤 EGRESO FAMILIAR MENSUAL
*Tabla fija de conceptos de gasto mensual del hogar.*

| Etiqueta Orig. (Excel) | Tipo de Campo (UI en Móvil) | Notas / Ayuda en App |
| :--- | :--- | :--- |
| `"SERVICIOS (Agua, luz, teléfono, gas, cable, internet)"` | `Number` (Moneda) | Sub-desglose lateral: **AGUA**, **LUZ**, **TELÉFONO**, **GAS**, **TV DE PAGA**, **INTERNET** — registrar cuánto se paga al mes por cada uno. |
| `"ALIMENTACIÓN Y DESPENSA"` | `Number` (Moneda) | |
| `"VESTIDO Y CALZADO"` | `Number` (Moneda) | Si se encuentra diferido, anotar. Ej: *$10,000 anuales*. |
| `"COLEGIATURAS"` | `Number` (Moneda) | |
| `"TARJETAS DE CRÉDITO U OTROS CRÉDITOS"` | `Number` (Moneda) | Anotar la institución financiera de donde sean los créditos. |
| `"TRANSPORTACIÓN (PASAJES O GASOLINA)"` | `Number` (Moneda) | |
| `"RENTA, HIPOTECA, INFONAVIT"` | `Number` (Moneda) | Indicar cuál de las 3 paga, o si son 2 en conjunto. |
| `"GASTOS MÉDICOS"` | `Number` (Moneda) | |
| `"RECREACIONES"` | `Number` (Moneda) | |
| `"OTROS GASTOS"` | `Number` (Moneda) | Desglosar el concepto del gasto extra. Ej: *gimnasio*. |
| `"TOTAL EGRESOS"` | `Number` (Auto-calculado) | Suma de todos los conceptos de egreso. |
| `"DIFERENCIA TOTAL"` | `Number` (Auto-calculado) | `TOTAL INGRESOS - TOTAL EGRESOS`. Si es negativo, mostrar alerta UI y requerir justificación. |

---

### 🩺 7. ESTADO DE SALUD Y HÁBITOS
*Sección tipo cuestionario médico del formato.*

| Etiqueta Orig. (Excel) | Tipo de Campo (UI en Móvil) | Notas / Ayuda en App |
| :--- | :--- | :--- |
| `"SERVICIO MÉDICO:"` | `Radio Buttons` / `Select` | (IMSS, ISSSTE, INSABI, PARTICULAR, OTRO) |
| `"ULTIMA CITA CON EL MÉDICO (FECHA)"` | `Date` (Fecha) | |
| ↳ `"CAUSA:"` | `Text` (Texto corto) | |
| `"ENFERMEDADES CRÓNICAS O ACTUALES:"` | `Switch` (Sí/No) | |
| ↳ `"CUÁL?:"` | `Text` (Texto corto) | |
| `"INTERVENCIÓN QUIRÚRGICA?"` | `Switch` (Sí/No) | "registrar lo que dice el candidato" |
| ↳ `"CUÁL?:"` | `Text` (Texto corto) | |
| `"ALERGIAS?"` | `Switch` (Sí/No) | |
| ↳ `"CUÁL?:"` | `Text` (Texto corto) | |
| `"ENFERMEDADES CRÓNICAS O HEREDITARIAS EN TU FAMILIA..."`| `Switch` (Sí/No) | |
| ↳ `"CUÁLES?:"` | `Text` (Texto corto) | |
| ↳ `"QUIEN LOS PADECE?"` | `Text` (Texto corto) | |
| `"CONSUME ALGÚN MEDICAMENTO?"` | `Switch` (Sí/No) | |
| ↳ `"CUÁL?:"` | `Text` (Texto corto) | |
| `"CONSUME ALGUNA DROGA?"` | `Switch` (Sí/No) | |
| ↳ `"CUÁL?:"` | `Text` (Texto corto) | |
| `"¿CÓMO CONSIDERA SU ESTADO DE SALUD?"` | `Select` | (EXCELENTE, BUENO, REGULAR, MALO) |
| `"HA SUFRIDO ACCIDENTES?"` | `Switch` (Sí/No) | |
| `"CUIDADOS MÉDICOS ESPECIALES:"` | `Textarea` (Texto largo) | |
| `"FUMA?"` | `Switch` (Sí/No) | |
| ↳ `"CUÁNTOS CIGARROS FUMA DIARIO?"` | `Number` (Teclado numérico) | |
| `"TOMA?"` | `Switch` (Sí/No) | |
| ↳ `"CADA CUÁNDO?"` | `Text` (Texto corto) | |
| ↳ `"QUÉ TIPO DE BEBIDA?"` | `Text` (Texto corto) | |

---

### 🗣️ 8. INFORMACIÓN SOCIAL Y PASATIEMPOS
*Actividades extracurriculares, pasatiempos y afiliaciones sociales del candidato.*

| Etiqueta Orig. (Excel) | Tipo de Campo (UI en Móvil) | Notas / Ayuda en App |
| :--- | :--- | :--- |
| `"QUÉ PASATIEMPOS TIENE?"` | `Text` (Texto) | |
| `"¿PRACTICA ALGÚN DEPORTE?"` | `Switch` (Sí/No) | Si marca Sí, abre subcampos |
| ↳ `"¿CUÁL?"` | `Text` (Texto corto) | |
| ↳ `"¿CON QUÉ FRECUENCIA?"` | `Text` (Texto corto) | |
| `"REALIZA ALGUNA ACTIVIDAD FAMILIAR?"` | `Switch` (Sí/No) | Si marca Sí, abre subcampos |
| ↳ `"¿CUÁL?"` | `Text` (Texto corto) | |
| ↳ `"¿CON QUÉ FRECUENCIA?"` | `Text` (Texto corto) | |
| `"ASISTE A DISCOS, BARES, RESTAURANTES?"` | `Switch` (Sí/No) | Si marca Sí, abre subcampos |
| ↳ `"¿CUÁL?"` | `Text` (Texto corto) | |
| ↳ `"¿CON QUÉ FRECUENCIA?"` | `Text` (Texto corto) | |
| `"¿ASISTE A EVENTOS RELIGIOSOS O POLÍTICOS?"` | `Switch` (Sí/No) | Si marca Sí, abre subcampos |
| ↳ `"¿CUÁL?"` | `Text` (Texto corto) | |
| ↳ `"¿CON QUÉ FRECUENCIA?"` | `Text` (Texto corto) | |
| `"¿ESTÁ AFILIADO A ALGÚN PARTIDO POLÍTICO?"` | `Switch` (Sí/No) | Si marca Sí, abre subcampos |
| ↳ `"¿CUÁL?"` | `Text` (Texto corto) | |
| `"¿ESTÁ AFILIADO A ALGÚN GRUPO DEPORTIVO, SOCIAL O RELIGIOSO?"` | `Switch` (Sí/No) | Si marca Sí, abre subcampos |
| ↳ `"¿CUÁL?"` | `Text` (Texto corto) | |
| `"¿TIENE TATUAJES O PIERCINGS?"` | `Switch` (Sí/No) | registrar lo que conteste el candidato (PROHIBIDO QUE SE LOS MUESTRE) |

---

### ⚖️ 9. ÁREA JURÍDICA
*Historial legal, laboral y participaciones sindicales o políticas del candidato y su familia.*

| Etiqueta Orig. (Excel) | Tipo de Campo (UI en Móvil) | Notas / Ayuda en App |
| :--- | :--- | :--- |
| `"USTED O ALGÚN FAMILIAR HA ESTADO INVOLUCRADO EN ALGÚN PROCESO LEGAL"` | `Switch` (Sí/No) | Si marca Sí, abre subcampos |
| ↳ `"¿POR QUÉ?:"` | `Text` (Texto corto) | |
| ↳ `"¿QUIÉN?"` | `Text` (Texto corto) | |
| `"UD. O ALGÚN FAMILIAR HA SIDO PRIVADO DE SU LIBERTAD"` | `Switch` (Sí/No) | Si marca Sí, abre subcampos |
| ↳ `"¿POR QUÉ?:"` | `Text` (Texto corto) | |
| ↳ `"¿QUIÉN?"` | `Text` (Texto corto) | |
| `"UD. O ALGÚN FAMILIAR HA ESTADO INVOLUCRADO EN PROBLEMAS LABORALES"` | `Switch` (Sí/No) | Si marca Sí, abre subcampos |
| ↳ `"¿POR QUÉ?:"` | `Text` (Texto corto) | |
| ↳ `"¿QUIÉN?"` | `Text` (Texto corto) | |
| `"UD. O ALGÚN FAMILIAR HA PERTENECIDO O PERTENECE A ALGÚN PARTIDO POLÍTICO"` | `Switch` (Sí/No) | Si marca Sí, abre subcampos |
| ↳ `"¿CUÁL?"` | `Text` (Texto corto) | |
| ↳ `"¿QUIÉN?"` | `Text` (Texto corto) | |
| `"UD. O ALGÚN FAMILIAR HA PERTENECIDO O PERTENECE A ALGÚN SINDICATO"` | `Switch` (Sí/No) | Si marca Sí, abre subcampos |
| ↳ `"¿CUÁL?"` | `Text` (Texto corto) | |
| ↳ `"¿QUIÉN?"` | `Text` (Texto corto) | |
| `"UD O ALGÚN FAMILIAR HA DESEMPEÑADO PUESTOS POLÍTICOS O SINDICALES"` | `Switch` (Sí/No) | Si marca Sí, abre subcampos |
| ↳ `"¿CUÁL?"` | `Text` (Texto corto) | |
| ↳ `"¿QUIÉN?"` | `Text` (Texto corto) | |

---

### � 10. ESTRUCTURA Y DINÁMICA DE LA VIVIENDA / PREGUNTAS CONDICIONALES
*Preguntas críticas de dinámica familiar y condiciones específicas del puesto obtenidas del formato físico.*

| Etiqueta Orig. (Excel) | Tipo de Campo (UI en Móvil) | Notas / Ayuda en App |
| :--- | :--- | :--- |
| `"¿PERSONAS EN CASA CON DISCAPACIDAD?"` | `Switch` (Sí/No) | Si marca Sí, abre subcampos |
| ↳ `"¿QUIÉN?"` | `Text` (Texto corto) | |
| ↳ `"¿DE QUÉ TIPO?"` | `Text` (Texto corto) | |
| `"NÚMERO DE DEPENDIENTES ECONÓMICOS"` | `Number` | |
| ↳ `"(CUANTOS Y QUIENES)"` | `Text` (Texto corto) | Referencia y detalle de los dependientes |
| `"¿EXISTIERON MATRIMONIOS O UNIONES LIBRES ANTERIORES?"` | `Switch` (Sí/No) | |
| `"¿TUVO HIJOS EN DICHOS MATRIMONIOS?"` | `Switch` (Sí/No) | Si marca Sí, abre subcampos |
| ↳ `"¿CUÁNTOS?"` | `Number` | |
| `"¿PROPORCIONA PENSIÓN ALIMENTICIA?"` | `Switch` (Sí/No) | Si marca Sí, abre subcampos |
| ↳ `"CANTIDAD MENSUAL"` | `Number` (Moneda) | |
| `"¿QUIÉN CUIDA A SUS HIJOS? (NOMBRE Y PARENTESCO)"` | `Text` (Texto corto) | |
| ↳ `"DONDE VIVE?"` | `Text` (Texto corto) | |
| ↳ `"¿ESTA DE ACUERDO SU PAREJA QUE TRABAJE?"` | `Switch` (Sí/No) | |
| `"DIRIGIDO PARA LAS ESPOSAS (OS) / PADRES:"` | `Label` (Sección) | |
| ↳ `"¿COMPRENDE LAS ACTIVIDADES QUE REALIZARÁ SU PAREJA/HIJO (A):?"` | `Text` (Texto largo) | |
| `"¿SU ESPOSA ESTÁ EMBARAZADA?"` | `Switch` (Sí/No) | |
| **`"DIRIGIDO PARA LAS ESPOSAS (OS) / PADRES: LAS SIGUIENTES PREGUNTAS SOLO APLICAN PARA CHOFERES, VENDEDORES O SUS AUXILIARES:"`** | `Label` (Sección) | |
| ↳ `"¿SABE QUE DE ACUERDO A LA OPERACIÓN SE LE PUEDE REQUERIR PARA RUTAS FORÁNEAS DE LUNES A SÁBADO?"` | `Switch` (Sí/No) | |
| ↳ `"¿TENDRÍAN ALGÚN INCONVENIENTE COMO FAMILIA POR LA AUSENCIA DE SU ESPOSO(A) / HIJO(A) TODA LA SEMANA?"` | `Switch` (Sí/No) | |

---

### 🏠 11. FOTOGRAFÍAS DEL ENTORNO (IN SITU)
*El corazón del Estudio Socioeconómico.*

| Etiqueta Orig. (Excel) | Tipo de Campo (UI en Móvil) | Notas / Ayuda en App |
| :--- | :--- | :--- |
| `"COMEDOR"` | `Camera` (Botón directo) | Toma desde la App (Bloquea subir de carrete, obliga a tomarla en el momento si es posible). |
| `"COCINA"` | `Camera` (Botón directo) | |
| `"SALA"` | `Camera` (Botón directo) | |
| `"FACHADA VISTA DESDE EL PATIO"` | `Camera` (Botón directo) | |
| `"VISTA FACHADA DESDE LA CALLE"` | `Camera` (Botón directo) | |

---

### 📝 12. RESUMEN Y FIRMA (CIERRE)
*Observaciones finales del encuestador tras salir de la casa.*

| Etiqueta Orig. (Excel) | Tipo de Campo (UI en Móvil) | Notas / Ayuda en App |
| :--- | :--- | :--- |
| `"OBSERVACIONES / RESUMEN..."` | `Textarea` (Texto muy largo) | Aquí relatan el entorno, limpieza, vestimenta, comportamiento general del entrevistado. |
| *(Leyenda legal — no editable)* | `Text Block` (Solo lectura) | Mostrar en la app antes de la firma con el siguiente texto exacto: *"DE CONFORMIDAD CON EL ARTÍCULO 47 FRACCIÓN 1 DE LA LEY FEDERAL DEL TRABAJO, DECLARO QUE LA INFORMACIÓN QUE PROPORCIONÉ EN EL PRESENTE ESTUDIO ES EXACTA Y VERÍDICA; QUEDANDO EN ENTENDIDO QUE CUALQUIER DECLARACIÓN FALSA EN CASO DE SER CONTRATADO, SERÁ CAUSA DE RESCISIÓN DE MI CONTRATO DE TRABAJO."* No se guarda en BD — forma parte del PDF. |
| `"FIRMA CANDIDATO"` | `Canvas` (Firma con dedo) + `Camera` (Opción alternativa) | Primario: el candidato firma con el dedo directamente en la pantalla. Alternativo: foto al documento físico firmado. La firma se guarda como imagen en Firebase Storage. |

---

### 💳 13. CRÉDITOS, PROPIEDADES Y PATRIMONIO
*Situación patrimonial del candidato y su familia: créditos vigentes, bienes raíces, vehículos y negocios activos.*

#### 💳 CRÉDITOS INSTITUCIONALES Y / O DEPARTAMENTALES:
*Dynamic Array (Agregar fila). Incluye filas pre-definidas fijas para INFONAVIT y FONACOT, más filas dinámicas adicionales.*

| Etiqueta Orig. (Excel) | Tipo de Campo (UI en Móvil) | Notas / Ayuda en App |
| :--- | :--- | :--- |
| **N/A** | `Dynamic Array` (Agregar fila) | Tabla con 2 filas pre-definidas no eliminables (INFONAVIT, FONACOT) + filas dinámicas opcionales. |
| `"INSTITUCIÓN Y/O TIENDA"` | `Text` (Texto corto) | Filas fijas: **INFONAVIT** y **FONACOT** (nota visible: *"Se le descuenta directo de nómina"*). Filas libres: nota *"Registrar algún otro crédito o tarjetas con las que cuente"*. |
| `"MONTO DEL CRÉDITO"` | `Number` (Moneda) | |
| `"MENSUALIDAD"` | `Number` (Moneda) | |
| `"ADEUDO"` | `Number` (Moneda) | |

#### 🏡 PROPIEDADES (De los que viven en la casa, aun cuando no sean del candidato)

##### BIENES RAÍCES (Casas, Terrenos, etc.):
*Dynamic Array (Agregar fila). Aplica a todos los habitantes del domicilio, no exclusivamente al candidato.*

| Etiqueta Orig. (Excel) | Tipo de Campo (UI en Móvil) | Notas / Ayuda en App |
| :--- | :--- | :--- |
| **N/A** | `Dynamic Array` (Agregar fila) | |
| `"TIPO DE PROPIEDAD"` | `Text` (Texto corto) | Nota encabezado: *"anotar propiedad aun no esté a nombre del candidato"*. Campo **obligatorio**. |
| `"UBICACIÓN"` | `Text` (Texto corto) | Campo **obligatorio**. |
| `"VALOR APROX. $"` | `Number` (Moneda) | Campo **obligatorio**. |
| `"A NOMBRE DE:"` | `Text` (Texto corto) | Campo **obligatorio**. |

##### VEHÍCULOS:
*Dynamic Array (Agregar fila). Aplica a todos los habitantes del domicilio, no exclusivamente al candidato.*

| Etiqueta Orig. (Excel) | Tipo de Campo (UI en Móvil) | Notas / Ayuda en App |
| :--- | :--- | :--- |
| **N/A** | `Dynamic Array` (Agregar fila) | |
| `"MARCA Y MODELO"` | `Text` (Texto corto) | Nota encabezado: *"anotar vehículo aun no esté a nombre del candidato"*. Campo **obligatorio**. |
| `"VALOR COMERCIAL $"` | `Number` (Moneda) | Campo **obligatorio**. |
| `"SALDO $"` | `Number` (Moneda) | Campo **obligatorio**. |
| `"A NOMBRE DE:"` | `Text` (Texto corto) | Campo **obligatorio**. |

#### 🏪 NEGOCIOS (Usted o alguno de sus familiares directos cuenta con algún negocio propio):
*Dynamic Array (Agregar fila). Aplica al candidato y a familiares directos.*

| Etiqueta Orig. (Excel) | Tipo de Campo (UI en Móvil) | Notas / Ayuda en App |
| :--- | :--- | :--- |
| **N/A** | `Dynamic Array` (Agregar fila) | |
| `"TIPO DE NEGOCIO / NOMBRE COMERCIAL"` | `Text` (Texto corto) | |
| `"UBICACIÓN"` | `Text` (Texto corto) | |
| `"PROPIETARIO:"` | `Text` (Texto corto) | Nota al lado: *"si cuenta con pagina de facebook poner el nombre y la imagen de lo que anuncia que vende"*. |

#### ❓ PREGUNTA INDIVIDUAL: ACTIVIDAD EN DESEMPLEO FORMAL
*Campo simple (no tabla dinámica). Se activa si el candidato no tiene empleo formal activo.*

| Etiqueta Orig. (Excel) | Tipo de Campo (UI en Móvil) | Notas / Ayuda en App |
| :--- | :--- | :--- |
| `"A QUE TE DEDICAS CUANDO NO TIENES EMPLEO FORMAL:"` | `Label` (Encabezado de bloque) | Pregunta individual que abre los dos subcampos siguientes. |
| ↳ `"INGRESO:"` | `Text` (Texto corto) | Descripción de la actividad y monto aproximado que percibe. |
| ↳ `"COMO TE ANUNCIAS:"` | `Text` (Texto corto) | Canal de difusión: redes sociales, boca a boca, volantes, etc. |

---

### 🏠 14. DATOS DEL INMUEBLE
*Caracterización física y material de la vivienda que habita el candidato. Permite al evaluador documentar las condiciones reales del hogar.*

| Etiqueta Orig. (Excel) | Tipo de Campo (UI en Móvil) | Notas / Ayuda en App |
| :--- | :--- | :--- |
| `"LA CASA QUE HABITA ES:"` | `Select` | Opciones: **PROPIA** / **RENTADA** / **PRESTADA** |
| ↳ `"VALOR APROXIMADO"` | `Number` (Moneda) | Aparece siempre junto al select anterior. |
| `"SUPERFICIE"` | `Text` (Texto corto) | Metros cuadrados aproximados del inmueble. |
| `"FACHADA"` | `Text` (Texto corto) | Material de la fachada (ej: block, tabique, madera). |
| `"NÚMERO DE BAÑOS"` | `Number` (Teclado numérico) | |
| `"PISOS (MATERIAL)"` | `Text` (Texto corto) | Ej: loseta, cemento, madera, mármol. |
| `"PAREDES (MATERIAL)"` | `Text` (Texto corto) | Ej: tabique, madera, lámina. |
| `"NIVELES DEL INMUEBLE"` | `Radio Buttons` | Opciones: **1** / **2** / **3** |
| `"MUEBLES QUE POSEE"` | `Checkboxes` (Múltiple) | Opciones: **SALA**, **ESTUFA**, **LAVADORA**, **REFRIGERADOR**, **ELECTRODOMÉSTICOS**, **AIRE ACONDICIONADO**, **TV**, **COMEDOR**, **COMPUTADORA**, **CENTRO DE ENTRETENIMIENTO**, **CAFETERA**, **LIBRERO** |
| `"ESTADO DE LOS MUEBLES"` | `Radio Buttons` | Opciones: **BUENO** / **REGULAR** / **MALO** |
| `"¿SERVICIOS PÚBLICOS?"` | `Checkboxes` (Múltiple) | Opciones: **AGUA**, **DRENAJE**, **ELECTRICIDAD**, **GAS**, **TELÉFONO** |
| `"ESTADO DE LA VIVIENDA:"` | `Radio Buttons` | Opciones: **BUENO** / **REGULAR** / **MALO** |
| `"ORDEN Y LIMPIEZA:"` | `Radio Buttons` | Opciones: **BUENO** / **REGULAR** / **MALO** |
| `"ZONA EN LA QUE ESTÁ UBICADA:"` | `Radio Buttons` | Opciones: **INDUSTRIAL** / **RESIDENCIAL** / **MEDIA** / **POPULAR** / **RURAL** |
| `"PREDIAL"` | `Text` (Texto corto) | Número o referencia del predial. |
| `"NÚMERO DE RECÁMARAS"` | `Number` (Teclado numérico) | |
| `"¿CUENTA CON SALA?"` | `Switch` (Sí/No) | |
| `"¿CUENTA CON JARDÍN?"` | `Switch` (Sí/No) | |
| `"¿CUENTA CON COMEDOR?"` | `Switch` (Sí/No) | |
| `"¿CUENTA CON COCHERA?"` | `Switch` (Sí/No) | |
| `"¿CUENTA CON COCINA?"` | `Switch` (Sí/No) | |
| `"¿CUENTA CON PATIO?"` | `Switch` (Sí/No) | |
| `"MEDIO DE TRANSPORTE DISPONIBLE DE TU DOMICILIO AL LUGAR DE TRABAJO EN SIGMA?"` | `Text` (Texto corto) | Nota: *Tienda donde va a trabajar. Si no sabe, preguntarle al Cedis de Sigma.* |
| `"TIEMPO DE TRASLADO?"` | `Text` (Texto corto) | Ej: 30 minutos, 1 hora. |
| `"PRECIO, PASAJE?"` | `Number` (Moneda) | Costo diario o por viaje. |
| `"TIEMPO DE RESIDIR EN EL DOMICILIO ACTUAL:"` | `Text` (Texto corto) | Ej: 3 años, 6 meses. |
| `"TIEMPO DE RESIDIR EN DOMICILIO ANTERIOR:"` | `Text` (Texto corto) | Ej: 2 años. |

---

### 👥 15. REFERENCIAS VECINALES
*Información proporcionada por vecinos del candidato para corroborar su residencia y carácter. Se capturan como un Dynamic Array con botón "Agregar Referencia Vecinal", mínimo 2 registros recomendados.*

**Patrón de UI:** `Dynamic Array` — Botón: **[ + Agregar Referencia Vecinal ]**
*Cada referencia despliega el siguiente bloque de campos:*

| Etiqueta Orig. (Excel) | Tipo de Campo (UI en Móvil) | Notas / Ayuda en App |
| :--- | :--- | :--- |
| `"NOMBRE"` | `Text` (Texto corto) | Campo **obligatorio**. |
| `"OCUPACIÓN"` | `Text` (Texto corto) | Campo **obligatorio**. |
| `"TELÉFONO"` | `Text` (Teclado numérico/tel) | Campo **obligatorio**. |
| `"DOMICILIO"` | `Text` (Texto corto) | Campo **obligatorio**. |
| `"TIEMPO DE CONOCERLO"` | `Text` (Texto corto) | Campo **obligatorio**. Ej: 5 años, desde la infancia. |
| `"EL CANDIDATO VIVE AHÍ?"` | `Switch` (Sí/No) | Campo **obligatorio**. Confirma que el vecino avala la residencia. |
| `"¿SABE CUÁNTOS HIJOS TIENE?"` | `Text` (Texto corto) | Campo **obligatorio**. El vecino menciona si conoce o no. |
| `"¿SABE QUIEN CUIDA A SUS HIJOS CUANDO TRABAJA?"` | `Text` (Texto corto) | Campo **obligatorio**. |
| `"LE CONOCE EMPLEOS ANTERIORES (¿CUÁLES?)"` | `Text` (Texto largo) | Campo **obligatorio**. |
| `"COMENTARIOS SOBRE EL CANDIDATO, ¿CÓMO LO CONSIDERA?"` | `Textarea` (Texto largo) | Campo **obligatorio**. Percepción general del vecino sobre el candidato. |

> **Nota de implementación:** En el Excel original estas referencias se presentan como dos columnas paralelas (Vecino 1 y Vecino 2). En móvil se adopta el patrón Dynamic Array para mayor ergonomía y escalabilidad, permitiendo agregar más de dos vecinos si el encuestador lo requiere.

---

### 👤 15b. REFERENCIAS PERSONALES
*Personas que conocen al candidato fuera del entorno familiar o laboral (NO familiares directos, NO jefes anteriores). Se capturan como Dynamic Array con botón "Agregar Referencia Personal", mínimo 2 registros recomendados.*

**Encabezado en Excel:** `"PERSONALES (NO FAMILIARES DIRECTOS NI JEFES ANTERIORES)"`

**Patrón de UI:** `Dynamic Array` — Botón: **[ + Agregar Referencia Personal ]**
*Cada referencia despliega el siguiente bloque de campos:*

| Etiqueta Orig. (Excel) | Tipo de Campo (UI en Móvil) | Notas / Ayuda en App |
| :--- | :--- | :--- |
| `"NOMBRE"` | `Text` (Texto corto) | Campo **obligatorio**. |
| `"TELÉFONO"` | `Text` (Teclado numérico/tel) | Campo **obligatorio**. |
| `"OCUPACIÓN"` | `Text` (Texto corto) | Campo **obligatorio**. |
| `"DOMICILIO"` | `Text` (Texto corto) | Campo **obligatorio**. |
| `"TIEMPO DE CONOCERLO"` | `Text` (Texto corto) | Campo **obligatorio**. Ej: 3 años, desde la universidad. |
| `"REFERENCIA"` | `Textarea` (Texto largo) | Campo **obligatorio**. Descripción libre de cómo se conocen y el tipo de relación. |

> **Nota de implementación:** En el Excel original estas referencias se presentan como dos columnas paralelas (Referencia Personal 1 y Referencia Personal 2). En móvil se adopta el mismo patrón Dynamic Array que las Referencias Vecinales para consistencia y escalabilidad.

---

### 🔍 16. OTROS DATOS
*Preguntas críticas para detectar conflicto de interés con el Grupo. Sección de captura individual (no tabla dinámica).*

**Encabezado en Excel:** `"OTROS DATOS"`

#### 16.1 Experiencia previa en el Grupo

| Etiqueta Orig. (Excel) | Tipo de Campo (UI en Móvil) | Notas / Ayuda en App |
| :--- | :--- | :--- |
| `"HA TRABAJADO EN ALGUNA EMPRESA DEL GRUPO?"` | `Switch` (Sí/No) | Si marca "Sí", despliega los subcampos siguientes. |
| ↳ `"CUAL?"` | `Text` (Texto corto) | Nombre de la empresa del Grupo. |
| ↳ `"PERIODO:"` | `Text` (Texto corto) | Fechas de inicio y fin. Ej: Enero 2018 – Marzo 2020. |
| `"MOTIVO DE SALIDA:"` | `Textarea` (Texto largo) | Siempre visible cuando se responde "Sí" a la pregunta anterior. Permite capturar el motivo de baja con detalle. |

#### 16.2 Familiares en el Grupo

| Etiqueta Orig. (Excel) | Tipo de Campo (UI en Móvil) | Notas / Ayuda en App |
| :--- | :--- | :--- |
| `"TIENE FAMILIARES TRABAJANDO EN EL GRUPO?"` | `Switch` (Sí/No) | Si marca "Sí", despliega los subcampos siguientes. |
| ↳ `"NOMBRE:"` | `Text` (Texto corto) | Nombre completo del familiar. |
| ↳ `"PUESTO Y DEPARTAMENTO:"` | `Text` (Texto corto) | Puesto y área donde labora el familiar dentro del Grupo. |

> **Nota de implementación:** Esta sección es crítica para el protocolo de conflicto de interés del Grupo. Ambos bloques deben registrarse en `visitaDetalle.otrosDatos` como objeto plano (no array), dado que son preguntas individuales y no repetibles.
