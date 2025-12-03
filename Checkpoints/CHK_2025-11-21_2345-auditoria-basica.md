# Checkpoint: Auditoría básica de acciones (2025-11-21 23:45)

## Objetivo

Agregar un historial técnico de cambios que registre quién crea, actualiza, elimina o gestiona psicométricas y procesos clave, aprovechando el `requestId` y el logger estructurado ya existentes.

## Cambios en Base de Datos

1. **Nueva tabla `audit_logs`**
   - Definición en `drizzle/schema.ts`:
     - `id` int PK autoincrement.
     - `timestamp` (default `NOW()`).
     - `userId` (nullable).
     - `actorType` enum(`admin`, `client`, `system`) con default `system`.
     - `action` varchar(100).
     - `entityType` varchar(100).
     - `entityId` varchar(100) nullable.
     - `requestId` varchar(64) nullable.
     - `details` json nullable.
   - Migración `drizzle/0015_audit_logs.sql` creada y aplicada con `pnpm drizzle-kit migrate` contra `integra_rh_v2`.

2. **Helper de DB**
   - En `server/db.ts` se añadió:
     - Import de `auditLogs` e `InsertAuditLog`.
     - Función `createAuditLog(entry: InsertAuditLog)` que inserta en la tabla y es tolerante a falta de conexión (log de warning).

## Capa de Auditoría

1. **Helper genérico `logAuditEvent`**
   - Nuevo archivo `server/_core/audit.ts`:
     - Recibe `ctx: TrpcContext` y un objeto `{ action, entityType, entityId?, details? }`.
     - Determina `actorType` a partir de `ctx.user.role` (`admin`, `client`) o `system` si no hay usuario.
     - Llama a `createAuditLog` con:
       - `userId` (si existe).
       - `actorType`.
       - `action` (ej. `create`, `update`, `delete`, `assign_psychometrics`).
       - `entityType` (texto libre, p.ej. `"candidate"`, `"process_status"`).
       - `entityId` normalizado a string.
       - `requestId` desde `ctx.requestId`.
       - `details` (JSON con campos relevantes de la operación).
     - Si algo falla, sólo emite un `console.warn` y **no rompe** la lógica principal.

2. **Contexto con `requestId` (recordatorio)**
   - `server/_core/context.ts` ahora incluye `requestId` en `TrpcContext` y lo obtiene de:
     - `req.requestId` (middleware Express).
     - encabezado `x-request-id` o genera uno nuevo con `logger.ensureRequestId`.
   - Esto permite que cada registro en `audit_logs` se ligue a los logs de Cloud Run por `requestId`.

## Endpoints con Auditoría Conectada (Fase 1)

1. **Candidatos (`server/routers/candidates.ts`)**
   - `create` (admin):
     - Después de `db.createCandidate`, se llama a `logAuditEvent` con:
       - `action: "create"`
       - `entityType: "candidate"`
       - `entityId: id`
       - `details`: nombre completo, `clienteId`, `puestoId`.
   - `update` (admin):
     - Tras `db.updateCandidate`, se registra:
       - `action: "update"`
       - `entityType: "candidate"`
       - `entityId: input.id`
       - `details`: objeto `data` enviado (campos modificados).
   - `delete` (admin):
     - Tras `db.deleteCandidate`, se registra:
       - `action: "delete"`
       - `entityType: "candidate"`
       - `entityId: input.id`.

2. **Procesos (`server/routers/processes.ts`)**
   - `create` (admin):
     - Luego de calcular `clave` y crear el proceso con `db.createProcess`, se registra:
       - `action: "create"`
       - `entityType: "process"`
       - `entityId: id`
       - `details`: `candidatoId`, `clienteId`, `puestoId`, `tipoProducto`, `clave`.
   - `updateStatus` (admin):
     - Tras `db.updateProcess` del `estatusProceso`, se registra:
       - `action: "update"`
       - `entityType: "process_status"`
       - `entityId: input.id`
       - `details`: nuevo `estatusProceso`.
   - `updateCalificacion` (admin):
     - Tras `db.updateProcess` de `calificacionFinal`, se registra:
       - `action: "update"`
       - `entityType: "process_score"`
       - `entityId: input.id`
       - `details`: nueva `calificacionFinal`.

3. **Psicométricas (`server/routers/psicometricas.ts`)**
   - `asignarBateria` (admin):
     - Después de llamar a `asignarBateriaPsicometrica` y actualizar `candidate.psicometricos`:
       - `logAuditEvent` con:
         - `action: "assign_psychometrics"`
         - `entityType: "candidate"`
         - `entityId: candidate.id`
         - `details`: `asignacionId` (id devuelto por la API), `tests` y `bateria`.
   - `guardarReporte` (admin):
     - Tras subir JSON/PDF a Firebase Storage y actualizar `candidate.psicometricos`:
       - se arma un payload `{ status, pdf, json }`.
       - se registra:
         - `action: "update"`
         - `entityType: "candidate_psicometricos"`
         - `entityId: input.candidatoId`
         - `details`: `asignacionId`, `status`, `pdfDocumentId`, `jsonDocumentId` (si existen).

## Build y Estado

- Se ejecutó `pnpm run build` después de todos los cambios; compilación OK.
- Migraciones Drizzle aplicadas correctamente (`0015_audit_logs.sql`). Cloud Run ya tiene acceso a la nueva tabla tras el último deploy de `integra-rh-api`.

## Próximos pasos sugeridos

- Fase 2 de auditoría:
  - Conectar `logAuditEvent` a:
    - Historial laboral (estatus de investigación y comentarios).
    - Comentarios de candidato/proceso.
    - Creación/edición de usuarios/roles y generación de enlaces de cliente.
- Crear vista interna de auditoría en el panel admin (filtros por usuario, cliente, candidato, rango de fechas).
- Integrar parte de esta trazabilidad con **PVM-OBS-02** (healthcheck + métricas) y **PVM-SEC-01** (RBAC).

