# Resumen de tareas realizadas – Integra RH

Este documento resume los cambios implementados en el sistema durante la fase reciente de trabajo, para compartirlos con Paula y el equipo.

---

## 1. Consentimiento de datos del candidato

- Se implementó un flujo de consentimiento vía enlace único para cada candidato.
- Desde el detalle del candidato se puede:
  - Generar un enlace de consentimiento.
  - Enviarlo por correo electrónico, por WhatsApp o copiarlo al portapapeles.
- El estado del consentimiento se muestra claramente en la tarjeta “Consentimiento de datos”:
  - Pendiente de envío.
  - Enlace enviado (pendiente de firma).
  - Otorgado, con fecha y hora.
- El consentimiento se almacena en la tabla `candidate_consents` con token, expiración, IP, user‑agent y versión del aviso de privacidad.

---

## 2. Historial laboral e investigación telefónica

- Se consolidó el formato maestro de investigación en `context/formatos/campos_unificados.md` y se llevó al modelo `workHistory.investigacionDetalle` como JSON estructurado.
- El formulario de investigación laboral ahora se captura por **bloques**:
  1) Datos de la empresa y del puesto (giro, dirección, teléfono, jefe, actividades, recursos, horario).  
  2) Tiempo e incidencias (periodos trabajados, sueldos, motivos de salida, incapacidades, ausencias, antecedentes).  
  3) Desempeño y recomendación (matriz de desempeño, conflictividad, recomendación y conclusión).
- El formulario por bloques permite ir y venir entre secciones, marcando visualmente cuáles ya tienen información.
- A partir de la matriz se calcula un **puntaje numérico de desempeño** (`desempenoScore`) que se guarda en `workHistory`.
- En el detalle del candidato, cada empleo muestra:
  - Empresa, puesto, fechas, tiempo trabajado (calculado o declarado).
  - Estatus de la investigación (en revisión, revisado, terminado) con colores.
  - Dictamen y motivos de salida según RH y jefe inmediato.

---

## 3. Roles y permisos (RBAC)

- Se definieron roles internos en `context/SPEC-ROLES-INTERNOS.md` (superadmin, admin, recepción, analista) con sus responsabilidades.
- Se implementaron tablas `roles`, `role_permissions` y `user_roles` para un control fino de permisos por módulo y acción (ver, crear, editar, eliminar).
- En la interfaz:
  - Nueva pantalla **Roles y permisos**, donde se pueden ver, crear y configurar roles.
  - Relación usuarios ↔ roles gestionada desde la sección de Usuarios.
- El sistema ahora usa estos permisos para controlar el acceso a módulos como Clientes, Candidatos, Procesos, Pagos, etc.

---

## 4. Plazas normalizadas (clientSites)

- Se creó la tabla `clientSites` para manejar **plazas / sucursales / CEDIs** por cliente.
- Se añadieron columnas `clientSiteId` en:
  - `candidates` (plaza asociada al candidato).
  - `processes` (plaza asociada al proceso).
- En los formularios de candidatos y procesos:
  - Tras elegir un cliente se puede seleccionar una plaza específica de ese cliente.
  - Esto evita duplicar clientes por ciudad o sucursal.
- En la pantalla de **Clientes**:
  - Se agregó un botón con ícono de pin para abrir el diálogo de **Plazas** de cada cliente.
  - Dentro del diálogo se puede:
    - Ver las plazas actualmente registradas (nombre, ciudad, estado).
    - Agregar nuevas plazas de forma rápida.

---

## 5. Flujos integrados de alta (cliente, candidato y proceso)

- Se simplificaron los flujos “rápidos” para evitar datos que no se usan:
  - Se eliminó el campo *“Descripción del puesto”* de los pasos de creación de puesto en:
    - Flujo completo de cliente.
    - Flujo integrado de candidato.
    - Flujo de puesto → proceso.
- Estos flujos ahora:
  - Usan la plaza normalizada (`clientSiteId`).
  - Están alineados con la nueva definición de tipos de proceso (ver punto 6).

---

## 6. Catálogo de tipos de proceso simplificado

- Se creó el helper `client/src/lib/procesoTipo.ts` con tipos base y complementos:
  - Tipos base: `ILA`, `ESE`, `VISITA`, `BURÓ`, `LEGAL`, `SEMANAS`.
  - Complementos: ámbito (`LOCAL` | `FORANEO`) y extras (`BURÓ`, `LEGAL`).
- En la creación y edición de procesos el usuario ahora selecciona:
  - Tipo base (ej. ESE).
  - Ámbito (Local/Foráneo) y complementos (con buró / con investigación legal).
- El sistema traduce automáticamente esa combinación a `tipoProducto`:
  - Ejemplos: `ESE LOCAL`, `ESE FORANEO CON INVESTIGACIÓN LEGAL`, `VISITA LOCAL`, etc.
- En `ProcesoDetalle` se puede modificar después el tipo de proceso usando la misma lógica (base + complementos), lo que actualiza `tipoProducto` de forma consistente.

---

## 7. Listados, tablas y UX general

- Se corrigió la alineación y orden de columnas en **Procesos**:
  - Clave, Tipo, Candidato, Cliente, Plaza, Puesto, Responsable, Fecha Recepción, Estatus, Acciones.
  - La columna Plaza quedó inmediatamente después de Cliente.
- Se eliminaron barras de scroll horizontales internas en los contenedores, delegando el scroll al navegador para una experiencia más natural.
- Se implementó “zebra rows” (filas alternadas) para todas las tablas que usan el componente `Table`, lo que facilita leer filas contiguas.
- En la lista de **Candidatos** se retiró la columna Email para evitar ruido visual; esta información sigue disponible en el detalle.
- Se revisaron vistas de Clientes, Candidatos, Procesos, Usuarios, etc. para mejorar la visualización en escritorio y móvil (tablas en escritorio, tarjetas en móvil cuando hay poco ancho).

---

## 8. Buscador general y navegación

- Se corrigieron errores del buscador general y se amplió su alcance para buscar en varios módulos (candidatos, clientes, procesos, encuestadores).
- El menú lateral:
  - Se ajustó para colapsar mostrando solo iconos cuando corresponde.
  - Se mantiene fijo y accesible tanto en escritorio como en móvil, mejorando la navegación.

---

## 9. Colores de dictamen y estatus

- Se unificó la lógica de colores y etiquetas para la **calificación final del dictamen** en `client/src/lib/dictamen.ts`:
  - `recomendable` → verde.
  - `con_reservas` → ámbar.
  - `no_recomendable` → rojo.
  - `pendiente` → gris.
- Esta lógica se aplica de forma consistente en:
  - Dashboard de clientes (Mis procesos).
  - Detalle de proceso para clientes.
  - Detalle de candidato para clientes.
- Los colores de estatus de proceso se mantuvieron más suaves para no saturar la interfaz; el “semáforo” fuerte se reserva para el dictamen final.

---

## 10. Correcciones visuales y de responsividad

- Se ajustaron modales y diálogos (por ejemplo, el listado de procesos por cliente) para que se adapten al contenido sin cortarse.
- Se revisaron scrolls en listados largos para que funcionen bien tanto en computadora como en celular.
- Se añadieron colores alternos y badges de status en listas clave para que las filas y estados sean distinguibles de forma rápida.

---

## 11. Corrector ortográfico

- Se activó el corrector ortográfico del navegador en todos los campos de texto largos (`Textarea`):
  - `spellCheck` activado.
  - Idioma por defecto en español.
- Esto permite que, mientras las chicas capturan comentarios o descripciones, el propio navegador subraye errores y ofrezca sugerencias, ayudando a mantener la calidad de redacción.

---

## 12. Plazas administrables desde Clientes

- Además de usar plazas en candidatos y procesos, ahora se pueden administrar desde **Clientes**:
  - Cada cliente tiene un botón de “Plazas / sucursales”.
  - Se abre un diálogo que muestra las plazas existentes y permite agregar nuevas (nombre de la plaza, ciudad, estado).
- Esto formaliza la separación entre:
  - Cliente (empresa).
  - Plazas / CEDIs donde se atienden procesos.

---

## 5. Estabilización y Correcciones (Diciembre 2025)

- **Corrección de Emails:** Se solucionó un error crítico que impedía reenviar invitaciones a candidatos (Error 500) y se ajustaron los estilos de los correos para asegurar la legibilidad de los botones de acción.
- **Diagnóstico de Infraestructura:** Se identificó un bloqueo de seguridad (WAF) por parte del proveedor de pruebas psicométricas hacia la infraestructura de nube, diferenciándolo de errores de código.

---

Este resumen cubre las mejoras actuales. El siguiente gran bloque de trabajo ya especificado (en `context/SPEC-FLUJO-CANDIDATO-SELF-SERVICE.md`) es el **flujo self‑service del candidato**, donde el propio postulante llenará sus datos y parte de su historial desde un enlace temporal, con autosalvado, cuenta regresiva y trazabilidad completa. Ese flujo está listo para comenzar a implementarse.


---

## 5. Mejoras en Self-Service y Estabilidad (18/12/2025)

- **Estabilidad en Producción:**
  - Se corrigió un error de permisos (403) en el Portal de Clientes que impedía ver el expediente completo.
  - Se solucionó un error crítico (500) en "Alta Rápida" de procesos debido a duplicidad de claves consecutivas; ahora la generación de claves es robusta por prefijo.
- **UX Candidato (Self-Service):**
  - Se implementó una **barra de herramientas fija (Sticky Header)** en el formulario de pre-registro.
  - Incluye un botón explícito de **"Guardar borrador"** para dar tranquilidad al candidato.
  - Muestra la hora del último guardado exitoso.
