# Integra-RH v2 — Arquitectura Propuesta y Plan de Migración

Documento maestro para guiar la evolución de Integra‑RH desde un prototipo en Firebase + Vanilla JS hacia una arquitectura moderna basada en React, tRPC y Drizzle ORM sobre MySQL/TiDB. Se fundamenta en el estado actual descrito en `context/dossier_tecnico.md`.

---

## 1) Análisis y Propuesta de Valor

### Situación actual (Vanilla JS + Firebase)
- Firestore sin esquema relacional: difícil imponer integridad referencial, unicidad y relaciones N‑a‑1/1‑a‑N (joins emulados en cliente).
- Lógica distribuida en Cloud Functions: versiones, telemetría y depuración más complejas; acoplamiento a proveedores.
- Reglas de seguridad en Firestore: potentes pero propensas a errores; validación duplicada (frontend/servidor).
- Limitaciones analíticas: consultas agregadas/complejas y reportes requieren trabajo adicional o exportaciones ad‑hoc.
- DX acotada: sin tipado extremo a extremo; mayor probabilidad de divergencias entre cliente y servidor.

### Propuesta (React + tRPC + Drizzle + MySQL/TiDB)
- Tipado extremo a extremo: tRPC + Zod comparten contratos entre cliente y servidor; menos errores en tiempo de ejecución.
- Modelo relacional con migraciones: Drizzle define el esquema como código, genera migraciones y asegura integridad (FK, UNIQUE, CHECK).
- SQL escalable y portable: MySQL/TiDB facilita agregaciones, reportes y rendimiento estable; evita lock‑in en BBDD.
- Arquitectura en capas: BFF tRPC como frontera de seguridad; validación y autorización centralizadas en el backend.
- Observabilidad y CI/CD: mejores prácticas de registros, métricas y despliegue; tests en routers tRPC y servicios.
- Estrategia de riesgo: migración incremental (strangler pattern), conservando Firebase Auth/Storage en el PVM y sustituyéndolos gradualmente.

Resultado esperado: base sólida para crecer en funcionalidades (portal de clientes, dictámenes, analítica) con menor deuda técnica y mayor confiabilidad.

---

## 2) Propuesta de Fases de Migración

### Fase 1 — Piloto de Valor Mínimo (PVM)
Objetivo: migrar backend y base de datos, reconstruir autenticación (manteniendo Firebase Auth temporalmente) y el listado de clientes en React consumiendo tRPC.

- Infraestructura
  - Desplegar MySQL/TiDB (gestionado). Preparar Drizzle + migraciones iniciales (clientes, puestos, candidatos mínimos).
  - Servidor tRPC (Fastify/Express) con contexto de usuario proveniente de Firebase Auth (token verificado en backend).
  - Web SPA (Vite + React): login, vista de clientes (listado y detalle mínimo).
- Datos
  - Import inicial de `clients` y `posts` (y, opcional, `candidates` sin subcolecciones) desde Firestore a MySQL/TiDB.
- Entregables
  - Esquema SQL inicial en producción y migraciones versionadas.
  - Endpoints tRPC: `auth.me`, `clients.list`, `clients.get`, `posts.listByClient`.
  - UI React: Login + Listado de clientes (filtro/orden básico).
- Criterios de aceptación
  - Login operativo contra Firebase Auth; listado de clientes 1:1 con Firestore.
  - Trazabilidad: logs de acceso y consultas; métricas básicas de API.
- Riesgos y mitigación
  - Desalineación de datos: ejecutar import idempotente y marcar origen; sólo lectura de Firestore tras corte.
  - Auth: mantener Firebase Auth en PVM para minimizar fricción.

### Fase 2 — Módulo de Candidatos
- CRUD de candidatos, comentarios y “historial laboral” (subcolección actual) en tablas relacionales.
- tRPC: `candidates.list|get|create|update`, `candidateComments.*`, `workHistory.*`.
- UI: listado, detalle con pestañas (datos, comentarios, historial laboral).

### Fase 3 — Módulo de Procesos
- Modelo de procesos con relaciones `cliente ↔ puesto ↔ candidato`, clave única, estatus, llegada y bitácora de comentarios.
- tRPC: `processes.*` y controles de integridad (transacciones al crear proceso).
- UI: tablero de procesos, filtros y detalle.

### Fase 4 — Psicométricas y Webhooks
- Backend tRPC gestiona asignaciones y consulta de resultados; endpoint público de webhook reemplaza Cloud Function.
- Almacena PDF/JSON de resultados; actualiza estatus de evaluación y proceso.
- Mantener SendGrid para correos transaccionales.

### Fase 5 — Portal de Clientes (RBAC)
- Rol “cliente” con acceso de solo lectura a sus procesos y resultados.
- Reemplazar enlaces “shareableId” por vistas autenticadas (mantener temporalmente enlaces públicos firmados si se requiere).

### Fase 6 — Dictamen V1
- Servicio de generación (DOCX→PDF en servidor); plantillas versionadas; colas/reintentos.

### Fase 7 — Seguridad, Auditoría y Cumplimiento
- RBAC completo, auditoría de cambios (tabla de eventos), retención y backups.

### Fase 8 — Observabilidad y Performance
- Trazas, métricas, dashboards; pruebas de carga; índice/optimización SQL; decidir migración de Storage (p.ej. S3/R2) si aplica.

---

## 3) Arquitectura Técnica Propuesta

### Stack Tecnológico
- Frontend: React + Vite, React Query/TanStack Query, Tailwind o equivalente de diseño.
- BFF/API: tRPC sobre Fastify/Express, Zod para validación, JWT derivado de Firebase Auth (PVM) o Auth.js más adelante.
- Persistencia: Drizzle ORM + `mysql2` sobre MySQL/TiDB; migraciones versionadas.
- Almacenamiento de archivos: Firebase Storage (transitorio) → opción S3/R2 en fase posterior.
- Email: SendGrid (continuidad con el sistema actual).
- Monorepo: `web/`, `server/`, `shared/` para tipos tRPC compartidos; PNPM workspaces.

### Módulos de Alto Nivel
- Autenticación y Autorización (contexto tRPC, RBAC, policies de acceso por `clienteId`).
- Catálogos: Clientes (`clients`) y Puestos (`posts`).
- Candidatos: datos, comentarios y historial laboral.
- Procesos: flujo principal, estatus, bitácora, visitas.
- Psicométricas: asignación, webhook, almacenamiento de resultados (JSON/PDF).
- Notificaciones: correo transaccional (SendGrid).
- Archivos: gestión de dictámenes y adjuntos.
- Reporting/Analítica: consultas agregadas y exportables.

### Topología y Flujo
React (SPA) → tRPC (BFF) → Servicios de Dominio → Repositorios (Drizzle) → MySQL/TiDB.
Webhooks externos (Psicométricas) → Endpoint público (verificación + colas) → Persistencia → Notificaciones.

### Seguridad
- Contexto tRPC valida el token (Firebase en PVM). Autorización por recurso: comprobar pertenencia a `clienteId` antes de resolver.
- Rate‑limit en endpoints públicos (webhook). Sanitización de archivos y almacenamiento con claves firmadas.

---

## 4) Modelo de Datos Inicial (SQL)

Las definiciones siguientes derivan de la estructura Firestore documentada (clientes, puestos, candidatos, subcolecciones, procesos y psicométricos). Se recomiendan IDs `CHAR(36)` (UUID) generados por la aplicación.

```sql
CREATE TABLE users (
  id            CHAR(36)      NOT NULL PRIMARY KEY,
  email         VARCHAR(255)  NOT NULL UNIQUE,
  display_name  VARCHAR(255)  NULL,
  role          ENUM('admin','cliente') NOT NULL DEFAULT 'admin',
  firebase_uid  VARCHAR(128)  NULL, -- PVM: enlaza con Firebase Auth
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE clients (
  id               CHAR(36)     NOT NULL PRIMARY KEY,
  nombre_empresa   VARCHAR(255) NOT NULL,
  ubicacion_plaza  VARCHAR(255) NULL,
  reclutador       VARCHAR(255) NULL,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE posts (
  id                 CHAR(36)     NOT NULL PRIMARY KEY,
  cliente_id         CHAR(36)     NOT NULL,
  nombre_del_puesto  VARCHAR(255) NOT NULL,
  created_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_posts_client FOREIGN KEY (cliente_id) REFERENCES clients(id)
    ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE candidates (
  id                CHAR(36)     NOT NULL PRIMARY KEY,
  cliente_id        CHAR(36)     NOT NULL,
  nombre_completo   VARCHAR(255) NOT NULL,
  email             VARCHAR(255) NOT NULL,
  medio_recepcion   VARCHAR(100) NULL,
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_candidates_email_cliente (email, cliente_id),
  CONSTRAINT fk_candidates_client FOREIGN KEY (cliente_id) REFERENCES clients(id)
    ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE candidate_work_history (
  id                     CHAR(36)     NOT NULL PRIMARY KEY,
  candidate_id           CHAR(36)     NOT NULL,
  empresa                VARCHAR(255) NOT NULL,
  puesto                 VARCHAR(255) NOT NULL,
  fecha_inicio           DATE         NULL,
  fecha_fin              DATE         NULL,
  contacto_referencia    VARCHAR(255) NULL,
  telefono_referencia    VARCHAR(50)  NULL,
  correo_referencia      VARCHAR(255) NULL,
  resultado_verificacion TEXT         NULL,
  observaciones          TEXT         NULL,
  created_at             DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_wh_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE candidate_comments (
  id           CHAR(36)     NOT NULL PRIMARY KEY,
  candidate_id CHAR(36)     NOT NULL,
  author       VARCHAR(255) NOT NULL,
  text         TEXT         NOT NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cc_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE processes (
  id                       CHAR(36)     NOT NULL PRIMARY KEY,
  candidato_id             CHAR(36)     NOT NULL,
  cliente_id               CHAR(36)     NOT NULL,
  puesto_id                CHAR(36)     NOT NULL,
  clave                    VARCHAR(64)  NOT NULL,
  fecha_recepcion          DATETIME     NULL,
  estatus_proceso          VARCHAR(50)  NULL,
  calificacion_final       VARCHAR(50)  NULL,
  archivo_dictamen_url     VARCHAR(500) NULL,
  shareable_id             CHAR(36)     NULL,
  arrival_datetime         DATETIME     NULL,
  visit_status_status      VARCHAR(32)  NULL, -- Asignada/Programada/Realizada
  visit_status_scheduled   DATETIME     NULL,
  created_at               DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at               DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_processes_clave (clave),
  CONSTRAINT fk_proc_candidate FOREIGN KEY (candidato_id) REFERENCES candidates(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_proc_client FOREIGN KEY (cliente_id) REFERENCES clients(id)
    ON UPDATE CASCADE ON DELETE RESTRICT,
  CONSTRAINT fk_proc_post FOREIGN KEY (puesto_id) REFERENCES posts(id)
    ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE process_comments (
  id           CHAR(36)     NOT NULL PRIMARY KEY,
  process_id   CHAR(36)     NOT NULL,
  text         TEXT         NOT NULL,
  process_status_at_time VARCHAR(50) NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  author       VARCHAR(255) NULL,
  CONSTRAINT fk_pc_process FOREIGN KEY (process_id) REFERENCES processes(id)
    ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE psychometric_evaluations (
  id                   CHAR(36)     NOT NULL PRIMARY KEY,
  candidate_id         CHAR(36)     NOT NULL,
  clave_psicometricas  VARCHAR(128) NULL,
  estatus              VARCHAR(32)  NULL, -- Asignado/Invitacion Enviada/Finalizado
  fecha_asignacion     DATETIME     NULL,
  fecha_envio          DATETIME     NULL,
  fecha_finalizacion   DATETIME     NULL,
  resultados_json      JSON         NULL,
  resultado_pdf_path   VARCHAR(500) NULL,
  created_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_pe_candidate FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    ON UPDATE CASCADE ON DELETE CASCADE
);
```

Notas:
- Los campos JSON permiten conservar fielmente estructuras provenientes de Psicométricas.mx.
- Índices adicionales se agregarán según patrones de consulta (por `cliente_id`, `estatus_proceso`, fechas, etc.).
- En PVM, los PDFs pueden permanecer en Firebase Storage; se almacena la ruta en `resultado_pdf_path` y `archivo_dictamen_url`.

---

## 5) Consideraciones de Migración de Datos
- Extracción: exportar colecciones Firestore (`clients`, `posts`, `candidates`, `candidates/*/workHistory`, `candidates/*/comments`, `processes`).
- Transformación: normalizar a las tablas definidas; mapear IDs; derivar `shareable_id` y `clave` cuando aplique.
- Carga: upserts idempotentes por lotes; verificar conteos y checks de integridad (FKs, UNIQUE).
- Congelamiento parcial: tras corte, solo escritura en MySQL/TiDB; Firestore queda en solo lectura hasta concluir.

---

## 6) Roadmap Técnico de Implementación (alto nivel)
- Monorepo con `web/`, `server/`, `shared/`.
- Drizzle: definir esquema, generar migraciones, CI que verifique drift.
- tRPC routers por dominio: `auth`, `clients`, `posts`, `candidates`, `processes`, `psychometrics`.
- Seguridad: middleware de autenticación, policies por `clienteId` en cada resolver.
- Observabilidad: logs estructurados, correlación por `requestId`, métricas básicas.

---

## 7) KPIs y Criterios de Éxito (PVM)
- Tiempo de respuesta p95 de `clients.list` < 200 ms (API).
- Paridad de datos: ±0 registros respecto a Firestore para `clients` y `posts`.
- Cero errores de autorización en producción durante la primera semana (>99.9% éxito en llamadas autenticadas).
- Implementación de migraciones repetibles (CI verde) y rollback documentado.

---

## 8) Próximos Pasos
- Validar el esquema SQL inicial y campos opcionales con negocio.
- Confirmar mantener Firebase Auth/Storage en PVM y planificar su sustitución en fases 5‑8.
- Calendarizar import de datos y ventana de corte para PVM.

