#################################################################

#

# DOSSIER TÉCNICO COMPLETO – PROYECTO INTEGRA-RH

# CHECKPOINT 1.0 - Piloto Técnico Funcional

#

#################################################################

Este documento recopila toda la información técnica vigente del proyecto INTEGRA-RH para asegurar una transición de desarrollo limpia y sin errores de contexto.

---

### 🎮 PUNTO DE CONTROL 1: CONTEXTO Y PROPÓSITO

- **Propósito general:** Crear una plataforma web en Firebase para la consultora de RRHH Paula León. El sistema debe reemplazar su gestión manual en hojas de cálculo, centralizando la información de clientes, puestos y candidatos.
- **Roles principales:**
  - **Administrador/Reclutador (Paula):** Control total sobre la plataforma.
  - **Cliente Empresarial:** Acceso de solo lectura a los procesos y resultados de sus propios candidatos.
  - **Candidato:** El sujeto de la evaluación. No tiene acceso a la plataforma, solo interactúa a través de correos y la plataforma de pruebas.
- **Flujos operativos clave:**
  1.  **Registro:** Creación de Clientes, Puestos y Candidatos en el sistema.
  2.  **Asignación:** Un administrador asigna una batería de pruebas psicométricas a un candidato.
  3.  **Notificación:** El sistema envía un correo automático al candidato con el enlace para sus pruebas.
  4.  **Seguimiento:** El sistema recibe una notificación automática (webhook) cuando el candidato finaliza.
  5.  **Resultados:** El sistema descarga los resultados (JSON) y el reporte (PDF) y los almacena.
- **Objetivo estratégico:** Automatizar el ciclo completo de evaluación psicométrica, desde la asignación hasta la entrega de resultados, para mejorar la eficiencia y la presentación profesional a los clientes.

---

### 🧱 PUNTO DE CONTROL 2: ARQUITECTURA TÉCNICA

- **Framework Frontend:** Actualmente se utiliza **HTML, CSS y JavaScript plano (vanilla JS)** para un prototipo funcional rápido. No se ha implementado un framework como React o Vue.
- **Servicios de Firebase utilizados:**
  - **Firestore:** Base de datos principal para toda la información (NoSQL).
  - **Firebase Authentication:** Para el sistema de login (Correo/Contraseña).
  - **Cloud Functions (v2):** Para toda la lógica de backend (conexión con APIs, envío de correos).
  - **Firebase Hosting:** Para desplegar la interfaz web.
  - **Firebase Storage:** Para almacenar los reportes en PDF.
- **Dependencias externas:**
  - **API de Psicométricas.mx:** Para la asignación de pruebas y consulta de resultados.
  - **SendGrid:** Para el envío de correos transaccionales (invitaciones a pruebas).
  - **Gemini API:** Planeada para futuras funcionalidades de IA (dictamen asistido), pero aún no integrada.
- **Variables de entorno:** Se utiliza un archivo `functions/.env` para gestionar las claves de las APIs de forma segura:
  - `PSICOMETRICAS_TOKEN`
  - `PSICOMETRICAS_PASSWORD`
  - `SENDGRID_API_KEY`
- **Mapa de comunicación:**
  1.  **Frontend (Hosting)** ↔ **Firestore:** Lee y escribe datos directamente para el dashboard.
  2.  **Frontend (Hosting)** → **Cloud Functions (onCall):** Llama a funciones seguras para ejecutar acciones (ej. `asignarPruebasPsicometricas`).
  3.  **Cloud Functions** ↔ **APIs Externas:** Las funciones se comunican con Psicométricas y SendGrid.
  4.  **API Psicométricas** → **Cloud Functions (onRequest):** Psicométricas llama a nuestro webhook para notificar la finalización de pruebas.

---

### 📘 PUNTO DE CONTROL 3: ESTRUCTURA DE DATOS (FIRESTORE)

Esta es la estructura oficial y definitiva.

- **Colección: `clients` (Global)**

  - `nombreEmpresa` (string)
  - `ubicacionPlaza` (string)
  - `reclutador` (string)

- **Colección: `posts` (Global)**

  - `nombreDelPuesto` (string)
  - `clienteId` (string) - _Relación con `clients`_

- **Colección: `candidates` (Global)**

  - `nombreCompleto` (string)
  - `email` (string)
  - `medioDeRecepcion` (string)
  - `clienteId` (string) - _Relación con `clients`_
  - `psicometricos` (map) - Creado y gestionado automáticamente por las Cloud Functions. Contiene:
    - `clavePsicometricas` (string)
    - `estatus` (string) - Ej: "Asignado", "Invitación Enviada", "Finalizado"
    - `fechaAsignacion`, `fechaEnvio`, `fechaFinalizacion` (string/timestamp)
    - `resultadosJson` (map) - El JSON devuelto por la API.
    - `resultadoPdfPath` (string) - La ruta al archivo en Firebase Storage.

- **Subcolección: `candidates/{candidateId}/workHistory` (Dependiente)**

paso  - `empresa` (string) - Nombre de la empresa.
  - `puesto` (string) - Puesto ocupado.
  - `fechaInicio` (string o date) - **(Nuevo)** Fecha de inicio en el empleo.
  - `fechaFin` (string o date) - **(Nuevo)** Fecha de fin en el empleo.
  - `tiempoTrabajado` (string) - *Legacy o para descripciones textuales.*
  - `contactoReferencia` (string) - Datos para verificación.
  - `telefonoReferencia` (string) - Datos para verificación.
  - `correoReferencia` (string) - Datos para verificación.
  - `resultadoVerificacion` (string) - Resultado de la verificación de referencias.
  - `observaciones` (string) - Comentarios internos de Paula.
  - `createdAt` (timestamp) - Fecha de creación del registro.

- **Subcolección: `candidates/{candidateId}/comments` (Dependiente)**

  - `text` (string) - Contenido del comentario.
  - `createdAt` (timestamp) - Fecha y hora del comentario.
  - `author` (string) - Email del administrador que hizo el comentario.

- **Colección: `processes` (Global)**
  - `candidatoId` (string) - _Relación con `candidates`_
  - `clienteId` (string) - _Relación con `clients`_
  - `puestoId` (string) - _Relación con `posts`_
  - `clave` (string) - Ej. "ILA-2025-001"
  - `fechaRecepcion` (timestamp)
  - `estatusProceso` (string) - Ej. "En Proceso", "Finalizado"
  - `calificacionFinal` (string) - Ej. "Recomendable"
  - `archivoDictamenUrl` (string) - _Ruta al PDF del dictamen en Storage_
  - `shareableId` (string) - _(Opcional)_ UUID para la URL pública de seguimiento.
  - `arrivalDateTime` (timestamp) - Fecha y hora de llegada del candidato para el proceso.
  - `visitStatus` (map) - Estatus de la visita domiciliaria.
    - `status` (string) - "Asignada", "Programada", "Realizada".
    - `scheduledDateTime` (timestamp) - Fecha y hora si está programada/realizada.
  - `comments` (array de map) - Bitácora de comentarios del proceso.
    - `text` (string) - Contenido del comentario.
    - `createdAt` (timestamp) - Fecha y hora del comentario.
    - `processStatusAtTime` (string) - Estatus del proceso cuando se hizo el comentario.

---

### ⚙️ PUNTO DE CONTROL 4: CLOUD FUNCTIONS

- **`asignarPruebasPsicometricas`**

  - **Trigger:** HTTPS `onCall` (llamada segura desde el frontend).
  - **Propósito:** Recibe un `candidatoId` y una lista de `tests`. Llama a la API de Psicométricas, guarda la clave en Firestore y envía el correo de invitación con SendGrid.
  - **Variables de entorno:** `PSICOMETRICAS_TOKEN`, `PSICOMETRICAS_PASSWORD`, `SENDGRID_API_KEY`.

- **`reenviarInvitacion`**

  - **Trigger:** HTTPS `onCall`.
  - **Propósito:** Recibe un `candidatoId`. Lee la clave de Psicométricas guardada en Firestore y vuelve a enviar el correo de invitación usando SendGrid.
  - **Variables de entorno:** `SENDGRID_API_KEY`.

- **`webhookResultadosPsicometricas`**
  - **Trigger:** HTTPS `onRequest` (URL pública).
  - **Propósito:** Recibe un `POST` de Psicométricas cuando un candidato termina. Usa la `clave` recibida para llamar al endpoint `consultaResultado` (JSON y PDF), guarda el PDF en Storage y los resultados JSON en Firestore, actualizando el estatus del candidato a "Finalizado".
  - **Variables de entorno:** `PSICOMETRICAS_TOKEN`, `PSICOMETRICAS_PASSWORD`.

---

### 🔗 PUNTO DE CONTROL 5: INTEGRACIONES EXTERNAS

- **API de Psicométricas:**
  - **Autenticación:** Credenciales (`Token`/`Password` o `token`/`password` dependiendo del endpoint) enviadas en el cuerpo de la petición.
  - **Endpoint `agregaCandidato`:** Usa `POST` con `Content-Type: application/x-www-form-urlencoded` y parámetros en mayúsculas (`Token`, `Password`, `Candidate`, `Email`, etc.).
  - **Endpoint `consultaResultado`:** Usa `GET` con parámetros en la URL (`Token`, `Password`, `Clave`, `Pdf`).
- **SendGrid:**
  - **Autenticación:** API Key (`SENDGRID_API_KEY`).
  - **Remitente:** Se utiliza un "Single Sender" verificado (`frank@vcorp.mx`).

---

### 🛡️ PUNTO DE CONTROL 6: SEGURIDAD Y CONTROL DE ACCESO

- **Roles y permisos:** [Pendiente de implementar a fondo]. La estructura actual solo distingue entre "usuario autenticado" y "público".
- **Mecanismo de autenticación:** Firebase Authentication con proveedor de **Correo/Contraseña**.
- **Reglas de Firestore:**
  ```javascript
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      // Solo usuarios autenticados pueden leer y escribir.
      match /{document=**} {
        allow read, write: if request.auth != null;
      }
    }
  }
  ```
- **Reglas de Storage:** [Pendiente de configurar]. Actualmente usan las reglas por defecto.
- **Claims personalizados:** [Pendiente de implementar]. Será necesario para diferenciar roles (admin vs. cliente).

---

### 💻 PUNTO DE CONTROL 7: FRONTEND Y EXPERIENCIA DE USUARIO

- **Estructura actual:** Una sola página (`index.html`) que contiene:
  1.  **Vista de Login.**
  2.  **Vista de Dashboard (oculta):** Se muestra al iniciar sesión. Contiene un layout de 3 paneles:
      - Panel 1: Lista de Clientes.
      - Panel 2: Lista de Candidatos.
      - Panel 3: Panel de Detalles (muestra info del candidato seleccionado, sus procesos, su historial laboral y la sección de psicometrías).
- **Flujos de usuario funcionales:**
  - Iniciar sesión → Ver dashboard → Seleccionar candidato → Ver sus detalles → Asignar pruebas → Recibir confirmación → Ver estatus actualizado.
  - Seleccionar candidato → Ver su historial → Añadir nuevo empleo → Ver el historial actualizado en tiempo real.
- **Manejo de estados:** Se gestiona con JavaScript plano, escuchando los cambios en Firestore en tiempo real con `onSnapshot` para mantener la interfaz actualizada automáticamente.

---

### 🚀 PUNTO DE CONTROL 8: ESTADO ACTUAL DEL PROYECTO

- **Módulos completados:**
  - Todo el ciclo de asignación y recepción de resultados de Psicométricas.
  - Envío de correos con SendGrid.
  - Autenticación de usuarios.
  - Lectura y escritura del historial laboral de un candidato.
  - Visualización de todas las colecciones principales.
- **Módulos pendientes:**
  - Formularios para la creación de nuevos **Candidatos**, **Clientes**, **Puestos** y **Procesos** desde la interfaz.
  - Generación automática de dictámenes.
  - Integración con Gemini.
  - Roles y permisos detallados para clientes.
- **Problemas detectados (resueltos):** Se superaron múltiples problemas de depuración relacionados con la inconsistencia de la API de Psicométricas (mayúsculas/minúsculas, métodos GET/POST), errores de despliegue de Cloud Functions (`Container Healthcheck Failed`) y configuración de dependencias (`package.json`).

---

### 🔧 PUNTO DE CONTROL 9: INFORMACIÓN FALTANTE Y GAPS

- **Colecciones no documentadas:** Ninguna. La estructura de datos está completamente definida en el Punto 3.
- **Funciones ambiguas:** Ninguna. Las 3 funciones existentes tienen un propósito claro y están probadas.
- **Dependencias sin registrar:** Ninguna. El archivo `package.json` está completo y sincronizado.
- **Elementos que requieren confirmación:** La documentación de la API de Psicométricas ha demostrado ser inconsistente. Cualquier nuevo endpoint a integrar requerirá pruebas exhaustivas.

---

### 🧠 PUNTO DE CONTROL 10: ROADMAP Y RECOMENDACIONES

- **Próximos pasos recomendados:**
  1.  **Construir los Formularios de Creación:** Darle a Paula la capacidad de añadir nuevos Clientes, Puestos y Candidatos desde la interfaz.
  2.  **Implementar la Creación de Procesos:** Crear la interfaz para vincular un candidato a un cliente y un puesto, generando un nuevo "proceso".
  3.  **Generación de Dictamen (V1):** Crear una Cloud Function que tome los datos recolectados y los use para rellenar una plantilla `.docx`.
- **Mejoras de arquitectura:**
  - **Migrar a Firebase SDK v9 (modular):** El frontend actual usa la sintaxis v8. Migrar a la v9 mejorará el rendimiento y el tamaño de la aplicación.
- **Estrategia de despliegue:** Continuar usando `firebase deploy` para publicar cambios. El control de versiones se gestiona con Git/GitHub.
- **Tabla Resumen de Módulos:**

| Módulo / Componente                      | Estado        | Prioridad |
| ---------------------------------------- | ------------- | --------- |
| **Autenticación**                        | ✅ Completado | -         |
| **Dashboard (Visualización)**            | ✅ Completado | -         |
| **Asignación de Pruebas (API + Correo)** | ✅ Completado | -         |
| **Recepción de Resultados (Webhook)**    | ✅ Completado | -         |
| **Gestión de Historial Laboral**         | ✅ Completado | -         |
| **Formulario: Crear Candidato**          | ⏳ Pendiente  | **Alta**  |
| **Formulario: Crear Cliente**            | ⏳ Pendiente  | Media     |
| **Formulario: Crear Puesto**             | ⏳ Pendiente  | Media     |
| **Formulario: Crear Proceso**            | ⏳ Pendiente  | Media     |
| **Generación de Dictamen**               | ⏳ Pendiente  | Alta      |
| **Roles para Clientes**                  | ⏳ Pendiente  | Baja      |

---

#################################################################
#
# ARQUITECTURA EVOLUCIONADA (v2) - Basada en `integra-rh-manus`
#
#################################################################

Esta sección documenta la nueva arquitectura que se está implementando durante la migración del PVM (Piloto de Valor Mínimo).

---

###  infraestructura: Base de Datos

- **Tecnología Principal:** Se ha migrado de Firestore (NoSQL) a una base de datos relacional **MySQL v8**.
  - **Razón (El Porqué):** Un sistema de RRHH como Integra-RH se beneficia enormemente de la integridad referencial y las capacidades de consulta de una base de datos SQL. Las relaciones entre Clientes, Candidatos, Puestos y Procesos son complejas y un esquema relacional previene la inconsistencia de datos a largo plazo.

- **Entornos de Nube (Staging/Producción):**
  - **Servicio:** **Google Cloud SQL**.
  - **Justificación:** Es una base de datos totalmente gestionada por Google, lo que nos libera de la carga de administrar backups, parches de seguridad y escalabilidad. Al estar en el mismo ecosistema que nuestras futuras Cloud Functions/Cloud Run, la latencia de red será mínima y la configuración de seguridad, más sencilla.

- **Entorno de Desarrollo Local:**
  - **Tecnología:** Contenedor **Docker** con una imagen oficial de MySQL 8.
  - **Justificación:** Permite a cada desarrollador tener una instancia de base de datos idéntica, limpia y aislada en su propia máquina. Acelera el desarrollo, permite trabajar sin conexión y asegura que todos trabajamos contra la misma versión de la base de datos.

- **Acceso y Credenciales:**
  - Las credenciales se gestionan de forma segura a través de **Google Secret Manager**.
  - La aplicación (tanto local como en la nube) consumirá una única variable de entorno, `DATABASE_URL`, para la conexión.

---

###  esquema: Base de Datos (Drizzle ORM)

- **Tecnología Principal:** Se ha adoptado **Drizzle ORM** como la capa de acceso a datos.
  - **Razón (El Porqué):** Drizzle es un ORM "TypeScript-first" que nos proporciona una seguridad de tipos completa al interactuar con la base de datos. A diferencia de otros ORMs, no genera un cliente pesado, sino que nos permite escribir queries muy cercanas a SQL pero con autocompletado y validación de tipos, combinando lo mejor de ambos mundos: rendimiento y seguridad en el desarrollo.

- **Fuente de Verdad:** El archivo `drizzle/schema.ts` es ahora la única fuente de verdad para la estructura de la base de datos. Cualquier cambio en las tablas o columnas debe realizarse en este archivo.

- **Gestión de Cambios (Migraciones):**
  - Se utiliza **Drizzle Kit** para gestionar los cambios en el esquema.
  - El flujo de trabajo es:
    1.  Modificar `drizzle/schema.ts`.
    2.  Ejecutar `pnpm drizzle-kit generate:mysql` para generar un archivo de migración SQL.
    3.  Ejecutar un script para aplicar las migraciones a la base de datos.
  - **Razón (El Porqué):** Este enfoque de "migraciones como código" nos da un control de versiones completo sobre la base de datos, asegurando que todos los entornos (desarrollo, staging, producción) tengan exactamente la misma estructura y evitando el "drift" o desajuste del esquema.

---

###  esquema: Base de Datos (Drizzle ORM)

- **Tecnología Principal:** Se ha adoptado **Drizzle ORM** como la capa de acceso a datos.
  - **Razón (El Porqué):** Drizzle es un ORM "TypeScript-first" que nos proporciona una seguridad de tipos completa al interactuar con la base de datos. A diferencia de otros ORMs, no genera un cliente pesado, sino que nos permite escribir queries muy cercanas a SQL pero con autocompletado y validación de tipos, combinando lo mejor de ambos mundos: rendimiento y seguridad en el desarrollo.

- **Fuente de Verdad:** El archivo `drizzle/schema.ts` es ahora la única fuente de verdad para la estructura de la base de datos. Cualquier cambio en las tablas o columnas debe realizarse en este archivo.

- **Gestión de Cambios (Migraciones):**
  - Se utiliza **Drizzle Kit** para gestionar los cambios en el esquema.
  - El flujo de trabajo es:
    1.  Modificar `drizzle/schema.ts`.
    2.  Ejecutar `pnpm drizzle-kit generate:mysql` para generar un archivo de migración SQL.
    3.  Ejecutar un script para aplicar las migraciones a la base de datos.
  - **Razón (El Porqué):** Este enfoque de "migraciones como código" nos da un control de versiones completo sobre la base de datos, asegurando que todos los entornos (desarrollo, staging, producción) tengan exactamente la misma estructura y evitando el "drift" o desajuste del esquema.
