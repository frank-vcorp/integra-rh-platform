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
- `[>]` PVM-DB-02: Ejecutar migraciones y CI (drift check)

### PVM - API (tRPC)
- `[ ]` PVM-API-01: Scaffold API tRPC + Zod

### PVM - Autenticación
- `[ ]` PVM-AUTH-01: Middleware de autenticación (Firebase)
- `[ ]` PVM-AUTH-02: Endpoint tRPC `auth.me`

### PVM - Lógica de Negocio (Endpoints)
- `[ ]` PVM-CLI-01: tRPC — clients.list / clients.get
- `[ ]` PVM-POS-01: tRPC — posts.listByClient

### PVM - Migración de Datos
- `[ ]` PVM-DATA-01: Export Firestore (clients/posts)
- `[ ]` PVM-DATA-02: ETL a MySQL/TiDB
- `[ ]` PVM-DATA-03: Verificación de conteos y FKs

### PVM - Frontend (React)
- `[ ]` PVM-WEB-01: Inicializar Vite + React
- `[ ]` PVM-WEB-02: Login con Firebase Auth
- `[ ]` PVM-WEB-03: Listado de Clientes
- `[ ]` PVM-WEB-04: Detalle de Cliente

### PVM - Tareas Transversales
- `[ ]` PVM-OBS-01: Logger estructurado y requestId
- `[ ]` PVM-OBS-02: Healthcheck y métricas básicas
- `[ ]` PVM-SEC-01: RBAC base (admin/cliente)
- `[ ]` PVM-DEV-01: Scripts y .env
- `[ ]` PVM-REL-01: Deploy stg (API + Web)
