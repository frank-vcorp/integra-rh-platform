# SPEC – Flujo de Puestos y Procesos

Este documento describe decisiones y ajustes de UX/funcionalidad relacionados con
la creación de **puestos** y **procesos** dentro de Integra RH.

Se irá ampliando conforme se vayan implementando los puntos acordados.

---

## P1 – Eliminar “Descripción del puesto” en flujos integrados

### Objetivo

Evitar que las usuarias tengan que capturar un texto libre de descripción
cuando crean un puesto desde los flujos integrados. La definición formal del
puesto se controla en otras herramientas; aquí solo se requiere identificar
cliente y nombre del puesto.

### Alcance

- Afecta solo a los flujos integrados:
  - `ClienteFormularioIntegrado` (flujo completo cliente → candidato → puesto → proceso).
  - `PuestoProcesoFlow` (flujo candidato/cliente ya existentes → puesto → proceso).
- La pantalla normal de `Puestos` ya no usa descripción y se mantiene igual.

### Comportamiento deseado

- Al crear un puesto dentro de estos flujos:
  - Solo se capturan:
    - `nombreDelPuesto`
    - `clienteId`
  - No se muestra ningún campo de descripción ni área de texto adicional.
- Los puestos que tengan una descripción previa en base de datos conservan
  esa información, pero no se muestra ni edita en la interfaz.

### Notas técnicas

- Frontend:
  - Eliminar el bloque de `Label + Textarea` asociado a `name="descripcion"`
    en:
    - `client/src/pages/ClienteFormularioIntegrado.tsx` (Paso 3: Crear Puesto).
    - `client/src/pages/PuestoProcesoFlow.tsx` (Paso 1: Crear Puesto).
  - Actualizar los handlers de envío para dejar de leer `descripcion` del
    formulario en estos componentes.
- Backend:
  - No se modifican routers ni esquemas:
    - `posts.create` y `posts.update` seguirán aceptando `descripcion` como
      campo opcional.
  - La columna de descripción del puesto permanece en la BD como nullable
    para compatibilidad hacia atrás.

---

## Próximos puntos relacionados (solo listado)

Estos puntos se documentarán con más detalle cuando se vayan a implementar:

- P2 – Modelo de **cliente único + plazas/sucursales** asociadas.
- P3 – Simplificación del catálogo de procesos:
  tipos base + complementos (foráneo, visita, etc.).
- P4 – Uso de colores solo para la **viabilidad/dictamen final**.
- P5 – Flujo unificado para que el candidato capture sus datos y otorgue
  consentimiento en un solo enlace.

---

## P2 – Cliente único + plazas normalizadas

### Objetivo

Evitar la creación de múltiples clientes para la misma empresa (ej. "SIGMA
OAXACA", "SIGMA XALAPA") y centralizar las **plazas/sucursales** en una
estructura propia, reutilizable y sin duplicados.

### Modelo de datos

- Nueva tabla `clientSites` (nombre tentativo):
  - `id` (PK autoincremental).
  - `clientId` → referencia a `clients.id`.
  - `nombrePlaza` (texto corto, ej. "XALAPA", "OAXACA CENTRO").
  - `ciudad` (opcional).
  - `estado` (opcional).
  - `activo` (boolean, por defecto `true`).
  - `createdAt`, `updatedAt`.
- Nuevas columnas opcionales:
  - `candidates.clientSiteId` → FK a `clientSites.id`.
  - `processes.clientSiteId` → FK a `clientSites.id`.
- `clients.ubicacionPlaza` se mantiene como campo legado / plaza principal.

### Comportamiento funcional

- Al crear o editar entidades:
  - **Cliente**:
    - Sigue siendo una ficha por empresa (razón social / nombre corporativo).
  - **Candidato**:
    - Después de elegir el cliente, se muestra un selector de **Plaza** que
      lista `clientSites` del cliente.
    - Se guarda en `candidates.clientSiteId`.
  - **Proceso**:
    - Mismo patrón: al tener `clienteId`, se selecciona la plaza.
    - Si el candidato ya tiene plaza, se usa como valor sugerido.
    - Se guarda en `processes.clientSiteId`.

### UX propuesta

- Selector de plazas:
  - Comportamiento:
    1. Select de cliente (como hoy).
    2. Al elegir cliente, se carga `clientSites` asociados.
    3. Select de plaza con:
       - Opciones existentes.
       - Opción especial: "**+ Nueva plaza…**".
  - Al elegir “+ Nueva plaza…”:
    - Se abre un diálogo ligero:
      - Campos: `nombrePlaza` (requerido), `ciudad` y `estado` (opcionales).
    - Al guardar:
      - Se crea el registro en `clientSites`.
      - Se actualiza el select y queda seleccionada la nueva plaza.

- Listados:
  - **Candidatos**:
    - Nueva columna "Plaza" mostrando `clientSites.nombrePlaza` (si existe).
  - **Procesos**:
    - Igual, columna "Plaza".
  - **Clientes**:
    - Se podrá añadir más adelante una vista de "Plazas del cliente" para
      administrarlas centralmente.

### Reglas y validaciones

- A nivel negocio:
  - De ahora en adelante se debe crear **un solo cliente por empresa** y
    siempre seleccionar una plaza desde `clientSites` en lugar de crear
    clientes duplicados por plaza.
- A nivel aplicación:
  - Antes de crear una nueva plaza, se comprobará que no exista ya otra
    con el mismo `nombrePlaza` para ese `clientId`.
  - Las plazas pueden marcarse como `activo = false` para ocultarlas sin
    perder historial.

### Notas técnicas

- Drizzle:
  - Definir `clientSites` en `drizzle/schema.ts` con `clientId` referenciando
    a `clients.id`.
  - Agregar `clientSiteId` opcional en `candidates` y `processes`.
  - Generar nueva migración con `drizzle-kit` y aplicarla a la BD.
- Routers/TRPC:
  - Crear un `clientSitesRouter` o endpoints anidados bajo `clients` para:
    - `listByClient(clientId)`.
    - `create({ clientId, nombrePlaza, ciudad?, estado? })`.
  - En formularios de candidato/proceso, usar estos endpoints para llenar
    y crear plazas.

