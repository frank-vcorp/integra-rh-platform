# Estado del Proyecto: Integra-RH v2

**Epopeya Actual:** `MIG-V2: Migración a Arquitectura Evolucionada`
**Fase Actual:** Piloto de Valor Mínimo (PVM)

---

### Leyenda de Estados
- `[ ]` Pendiente
- `[>]` En Progreso
- `[✓]` Hecho (Listo para QA)
- `[X]` Aprobado

### Guía de Uso
- El Director prioriza reordenando líneas (arriba = mayor prioridad).
- Gemini (Task Master) debe: al iniciar tarea, cambiar `[ ]`→`[>]`; al entregar, `[>]`→`[✓]`.
- Mantener solo una tarea `[>]` activa a la vez.
- Se pueden añadir subtareas como lista debajo de cada línea (opcional).

---

### PVM - Infraestructura
- `[X]` PVM-INF-01: Aprovisionar MySQL/TiDB (dev/stg/prod)

### PVM - Base de Datos (Drizzle)
- `[✓]` PVM-DB-01: Drizzle — Esquema y migraciones iniciales
  - *Configurar Drizzle + mysql2. Definir tablas base: users, clients, posts, candidates. Generar migraciones iniciales.*
- `[✓]` PVM-DB-02: Ejecutar migraciones y CI (drift check)
- `[✓]` PVM-DB-03: Conexión Cloud SQL (integra_rh_v2) y migraciones aplicadas

### PVM - API (tRPC)
- `[✓]` PVM-API-01: Scaffold API tRPC + Zod
- `[✓]` PVM-HIS-01: tRPC — workHistory get/create/update/delete
- `[✓]` PVM-COM-01: tRPC — candidateComments get/create
- `[>]` PVM-PRC-01: tRPC — processes.* (listar, detalle, crear)
  - `[✓]` Corrección en UI: ProcesoDetalle sin hooks condicionales (estable)
  - `[>]` Alinear queries/mutations (list/getById/update) con el front actual
  - `[ ]` Crear proceso (endpoint + UI)
- `[✓]` PVM-INT-API-01: Psicométricas — asignar/reenviar/consultar (tRPC)
- `[✓]` PVM-INT-API-02: Email — invitación psicométrica (tRPC)
- `[✓]` PVM-WHB-01: Webhook Psicométricas `POST /api/webhooks/psicometricas`

### PVM - Autenticación
- `[✓]` PVM-AUTH-01: Middleware de autenticación (Firebase)
- `[✓]` PVM-AUTH-02: Endpoint tRPC `auth.me`

### PVM - Lógica de Negocio (Endpoints)
- `[✓]` PVM-CLI-01: tRPC — clients.list / clients.get
- `[✓]` PVM-POS-01: tRPC — posts.listByClient

### PVM - Migración de Datos
- `[✓]` PVM-DATA-01: Export Firestore (clients/posts)
 - `[✓]` PVM-DATA-02: ETL a MySQL/TiDB — SPEC: `context/SPEC-PVM-DATA-02.md`
 - `[✓]` PVM-DATA-03: Verificación de conteos y FKs — SPEC: `context/SPEC-PVM-DATA-03.md`

### PVM - Frontend (React)
 - `[✓]` PVM-WEB-01: Inicializar Vite + React — SPEC: `context/SPEC-PVM-WEB-01.md`
 - `[✓]` PVM-WEB-02: Login con Firebase Auth — SPEC: `context/SPEC-PVM-WEB-02.md`
 - `[>]` PVM-WEB-03: Listado de Clientes — SPEC: `context/SPEC-PVM-WEB-03.md`
 - `[ ]` PVM-WEB-04: Detalle de Cliente — SPEC: `context/SPEC-PVM-WEB-04.md`
 - `[ ]` PVM-WEB-05: Historial laboral en CandidatoDetalle
 - `[ ]` PVM-WEB-06: Bitácora de candidato (comentarios)
 - `[ ]` PVM-WEB-07: UI Psicométricas (asignar/reenviar/ver resultados)
 - `[ ]` PVM-WEB-08: Envío de invitaciones (email)

### PVM - Tareas Transversales
 - `[ ]` PVM-OBS-01: Logger estructurado y requestId — SPEC: `context/SPEC-PVM-OBS-01.md`
 - `[ ]` PVM-OBS-02: Healthcheck y métricas básicas — SPEC: `context/SPEC-PVM-OBS-02.md`
 - `[ ]` PVM-SEC-01: RBAC base (admin/cliente) — SPEC: `context/SPEC-PVM-SEC-01.md`
 - `[✓]` PVM-DEV-01: Scripts y .env — SPEC: `context/SPEC-PVM-DEV-01.md`
   - *Actualizado `.env.example` (VITE_FIREBASE_*, VITE_APP_*, PSICOMETRICAS_*, SENDGRID_API_KEY) y `.env` local; unificada `VITE_API_URL=/api/trpc`.*
 - `[ ]` PVM-REL-01: Deploy stg (API + Web) — SPEC: `context/SPEC-PVM-REL-01.md`
