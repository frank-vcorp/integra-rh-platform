# Integra-RH v2 — Checklist para PROYECTO.md (PVM y siguientes)

Este checklist organiza tareas accionables por fase. Úsalo para añadir líneas en `PROYECTO.md` (sugerencias de títulos/IDs incluidas). Marca estados con [ ], [>], [✓], [X].

---

## Fase 1 — Piloto de Valor Mínimo (PVM)

- [ ] Infra/DB: Aprovisionar MySQL/TiDB en entorno (dev/stg/prod) — "PVM-INF-01"
- [ ] Drizzle: Configurar conexión `mysql2`, definición de esquema y migraciones iniciales — "PVM-DB-01"
- [ ] Drizzle: Ejecutar migraciones en dev y pipeline CI (drift check) — "PVM-DB-02"
- [ ] API: Scaffold servidor (Fastify/Express) + tRPC + Zod — "PVM-API-01"
- [ ] API: Middleware de autenticación con verificación de token de Firebase — "PVM-AUTH-01"
- [ ] API: Router `auth.me` (retorna usuario y rol) — "PVM-AUTH-02"
- [ ] API: Router `clients.list` y `clients.get` — "PVM-CLI-01"
- [ ] API: Router `posts.listByClient` — "PVM-POS-01"
- [ ] Datos: Export Firestore (`clients`, `posts`) — "PVM-DATA-01"
- [ ] Datos: Transformar y cargar a MySQL/TiDB (upsert idempotente) — "PVM-DATA-02"
- [ ] Datos: Verificación de conteos y llaves foráneas — "PVM-DATA-03"
- [ ] Web: Inicializar Vite + React + Tailwind (opcional) — "PVM-WEB-01"
- [ ] Web: Login con Firebase Auth (token para tRPC) — "PVM-WEB-02"
- [ ] Web: Vista Listado de Clientes (filtro/orden básico) — "PVM-WEB-03"
- [ ] Web: Vista Detalle mínimo de Cliente — "PVM-WEB-04"
- [ ] Observabilidad: Logger estructurado y `requestId` — "PVM-OBS-01"
- [ ] Observabilidad: Endpoint `/healthz` y métricas básicas — "PVM-OBS-02"
- [ ] Seguridad: Esqueleto RBAC (roles `admin`/`cliente`) en contexto tRPC — "PVM-SEC-01"
- [ ] DevEx: Scripts NPM, `.env` y plantilla de variables (PSICOMETRICAS_*, SENDGRID_API_KEY) — "PVM-DEV-01"
- [ ] Entorno: Deploy API (stg) + Web (stg) + prueba de punta a punta — "PVM-REL-01"

Aceptación PVM
- [ ] Paridad de datos: `clients` y `posts` equivalentes a Firestore
- [ ] `clients.list` p95 < 200 ms en stg
- [ ] Autenticación estable (>99.9% éxito en llamadas tRPC autenticadas)
- [ ] CI verde: migraciones repetibles y rollback documentado

---

## Fase 2 — Módulo de Candidatos

- [ ] DB: Tablas `candidates`, `candidate_comments`, `candidate_work_history` — "F2-DB-01"
- [ ] API: Routers `candidates.list|get|create|update` — "F2-API-01"
- [ ] API: Routers `candidateComments.*` — "F2-API-02"
- [ ] API: Routers `workHistory.*` — "F2-API-03"
- [ ] Web: Listado y detalle de candidato con pestañas (Datos/Comentarios/Historial) — "F2-WEB-01"
- [ ] Seguridad: Policies por `clienteId` en todas las operaciones — "F2-SEC-01"

---

## Fase 3 — Módulo de Procesos

- [ ] DB: Tabla `processes` y `process_comments` + índices — "F3-DB-01"
- [ ] API: `processes.create` con transacción (cliente/puesto/candidato) — "F3-API-01"
- [ ] API: `processes.list|get|update` + `processComments.*` — "F3-API-02"
- [ ] Web: Tablero de procesos con filtros (cliente, estatus) — "F3-WEB-01"
- [ ] Web: Detalle de proceso con bitácora de comentarios — "F3-WEB-02"

---

## Fase 4 — Psicométricas y Webhooks

- [ ] API: Servicio de asignación (credenciales, selección de pruebas) — "F4-API-01"
- [ ] API: Endpoint público de webhook (validación y rate-limit) — "F4-API-02"
- [ ] DB: `psychometric_evaluations` (JSON/PDF path, estatus/fechas) — "F4-DB-01"
- [ ] Archivos: Persistir PDF (Firebase Storage en PVM) — "F4-FIL-01"
- [ ] Web: UI de asignación y estatus en candidato/proceso — "F4-WEB-01"

---

## Fase 5 — Portal de Clientes (RBAC)

- [ ] Auth: Rol `cliente` y filtrado por `clienteId` en contexto — "F5-AUTH-01"
- [ ] Web: Vista de procesos/Resultados con acceso de solo lectura — "F5-WEB-01"
- [ ] Seguridad: Sustituir enlaces públicos por vistas autenticadas — "F5-SEC-01"

---

## Fase 6 — Dictamen V1

- [ ] Servicio: Generación DOCX→PDF con plantilla versionada — "F6-SRV-01"
- [ ] Archivos: Almacenamiento y versionado de plantillas — "F6-FIL-01"
- [ ] Web: Acción de generar/descargar dictamen — "F6-WEB-01"

---

## Fase 7 — Seguridad/Auditoría

- [ ] Auditoría: Tabla de eventos (alta/baja/cambios) — "F7-SEC-01"
- [ ] Backups: Estrategia y runbooks — "F7-OPS-01"

---

## Fase 8 — Observabilidad/Performance

- [ ] Trazas/Métricas: Dashboards básicos — "F8-OBS-01"
- [ ] Performance: Índices/optimizaciones SQL — "F8-DB-01"

---

### Sugerencias de Títulos para Tarjetas
- PVM-INF-01: Aprovisionar MySQL/TiDB (dev/stg/prod)
- PVM-DB-01: Drizzle — Esquema y migraciones iniciales
- PVM-API-01: Scaffold API tRPC + Zod
- PVM-AUTH-01: Middleware Auth (Firebase token)
- PVM-CLI-01: tRPC — `clients.list`/`get`
- PVM-POS-01: tRPC — `posts.listByClient`
- PVM-DATA-01: Export Firestore (clients/posts)
- PVM-DATA-02: ETL a MySQL/TiDB
- PVM-WEB-03: Web — Listado de clientes
- F2-API-01: tRPC — CRUD Candidatos
- F3-API-01: tRPC — Crear Proceso (transacción)
- F4-API-02: Webhook Psicométricas (public endpoint)
