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
- `[✓]` PVM-DB-03: Conexión Railway (integra_rh_v2) y migraciones aplicadas

### PVM - API (tRPC)
- `[✓]` PVM-API-01: Scaffold API tRPC + Zod
- `[✓]` PVM-HIS-01: tRPC — workHistory get/create/update/delete
- `[✓]` PVM-COM-01: tRPC — candidateComments get/create
- `[✓]` PVM-PRC-01: tRPC — processes.* (listar, detalle, crear)
  - `[✓]` Corrección en UI: ProcesoDetalle sin hooks condicionales (estable)
  - `[✓]` Alinear queries/mutations (list/getById/update) con el front actual
  - `[✓]` Crear proceso (endpoint + UI)
- `[✓]` PVM-INT-API-01: Psicométricas — asignar/reenviar/consultar (tRPC)
- `[✓]` PVM-INT-API-02: Email — invitación psicométrica (tRPC)
- `[✓]` PVM-INT-API-03: Reenviar invitación psicométrica por email (SendGrid)
  - *Decisión:* el reenvío se hace **solo por SendGrid** (sin llamar al endpoint `/reenviarInvitacion` del proveedor) para ahorrar peticiones y centralizar el canal.
  - *Implementación:* se almacena `psicometricos.invitacionUrl` al asignar; el reenvío usa esa URL o la reconstruye con la clave.
  - *Criterio de aceptación:* al presionar “Reenviar invitación”, se intenta enviar correo SendGrid y el candidato lo recibe (asumiendo `from` verificado).
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
 - `[✓]` PVM-WEB-03: Listado de Clientes — SPEC: `context/SPEC-PVM-WEB-03.md`
 - `[✓]` PVM-WEB-04: Detalle de Cliente — SPEC: `context/SPEC-PVM-WEB-04.md`
 - `[✓]` PVM-WEB-05: Historial laboral en CandidatoDetalle
 - `[✓]` PVM-WEB-06: Bitácora de candidato (comentarios)
 - `[✓]` PVM-WEB-07: UI Psicométricas (asignar/reenviar/ver resultados)
 - `[✓]` PVM-WEB-08: Envío de invitaciones (email)
 - `[✓]` PVM-WEB-09: Self-Service — Botón Guardar Borrador y Sticky Header (UX)

### SYNC-SS: Sincronización Self-Service ↔ Panel Analista (23 dic 2025)
 - `[✓]` SYNC-SS-01: Consentimiento en autosave — guardar aceptoAvisoPrivacidad en perfilDetalle.consentimiento
 - `[✓]` SYNC-SS-02: Badge de aceptación — mostrar "✅ ACEPTÓ TÉRMINOS (fecha)" en CandidatoDetalle
 - `[✓]` SYNC-SS-04: Sincronización BD ↔ localStorage — getDraftPayload() envía campos completos
   - Fix: garantizar que TODOS los campos se envían (incluyendo vacíos) para que merge preserve estructura
   - Test: script `scripts/test-sync.mjs` valida 7 escenarios críticos (7/7 PASS)
   - Checkpoint: `CHK_2025-12-23_FASE-4-PROBADA-E2E.md`
 - `[✓]` SYNC-SS-05: capturadoPor cuando analista edita — registrar "analista" y mostrar badge "(editado)"
 - `[ ]` SYNC-SS-03: % Completitud en CandidatoDetalle — mostrar progreso por sección (baja prioridad)

### PVM - Tareas Transversales
 - `[✓]` PVM-OBS-01: Logger estructurado y requestId — SPEC: `context/SPEC-PVM-OBS-01.md`
   - Logger JSON central (`server/_core/logger.ts`) y `requestId` por petición (contexto tRPC + middleware Express).
   - Base para auditoría: logs estructurados en Cloud Run enlazables por `requestId`.
 - `[ ]` PVM-OBS-02: Healthcheck y métricas básicas — SPEC: `context/SPEC-PVM-OBS-02.md`
 - `[ ]` PVM-SEC-01: RBAC base (admin/cliente) — SPEC: `context/SPEC-PVM-SEC-01.md`
 - `[✓]` PVM-DEV-01: Scripts y .env — SPEC: `context/SPEC-PVM-DEV-01.md`
   - *Actualizado `.env.example` (VITE_FIREBASE_*, VITE_APP_*, PSICOMETRICAS_*, SENDGRID_API_KEY) y `.env` local; unificada `VITE_API_URL=/api/trpc`.*
 - `[ ]` PVM-REL-01: Deploy stg (API + Web) — SPEC: `context/SPEC-PVM-REL-01.md`

### UI-REF: Refinamiento de UI/UX
 - `[✓]` UI-REF-01: Implementar Sistema de Diseño (shadcn/ui + Tremor) — SPEC: `context/SPEC-UI-REF-01.md`
 - `[✓]` UI-REF-02: Normalización visual a MAYÚSCULAS (global)
 - `[✓]` UI-REF-03: Ajuste etiqueta ILA → “INVESTIGACIÓN LABORAL”
 - `[X]` UI-REF-04: Borrador local en Investigación Laboral (localStorage) — SPEC: `context/SPEC-INVESTIGACION-LOCALSTORAGE.md`
 - `[X]` UI-REF-05: Incidencias duplicadas (candidato/empresa) — SPEC: `context/SPEC-INVESTIGACION-INCIDENCIAS-DUAL.md`

### PVM - Dashboard Clientes (Nuevo)
 - `[✓]` PVM-DASH-01 (Backend): Extender modelo proceso/candidato con especialista de atracción, estatus visual y bloques JSON de detalle (inv. laboral/legal, buró, visita). Migración Drizzle + tRPC.
 - `[✓]` PVM-DASH-02 (Frontend): Tarjeta semáforo + detalle expandible con los bloques nuevos (cliente). UI basada en `context/SPEC-DASHBOARD.md`. Incluye portal de cliente por enlace con branding Sinergia RH.

**Estado Actual (28/01/2026)**

- **Investigación Laboral - Borrador local (28 ene 2026):**
  - Se implementó persistencia local (localStorage) para el modal de Investigación Laboral en CandidatoDetalle, por candidato y empleo (`candidateId` + `workHistoryId`).
  - Al reabrir el modal se restauran los campos desde el borrador; al guardar exitosamente se limpia el borrador correspondiente en localStorage.
  - Se añadió confirmación al cerrar el modal cuando existe información sin guardar para evitar pérdidas accidentales.
  - Checkpoint: `CHK_2026-01-28_INVESTIGACION-LOCALSTORAGE.md` (incluye detalle de pruebas y alcance).
  - Deploy: cambios desplegados a hosting con `firebase deploy --only hosting` (https://integra-rh.web.app).

- **Investigación Laboral - Incidencias duplicadas (28 ene 2026):**
  - Se separaron campos de incidencias en candidato vs empresa (incapacidades, inasistencias/faltas y antecedentes legales).
  - Compatibilidad con datos legacy en backend.
  - SPEC: `context/SPEC-INVESTIGACION-INCIDENCIAS-DUAL.md`.

- **Portal de Cliente - Servicios Dinámicos (14 ene 2026):** Se implementó visualización dinámica en el portal de cliente:
  - El cliente ahora **solo ve los servicios que contrató** (ILA, Legal, Buró, Visita).
  - La visita es **opcional para todos los tipos** (ILA, ESE, etc.) y solo se muestra cuando hay datos registrados (encuestador asignado, fecha programada, etc.).
  - Nueva función `getServiciosIncluidos()` en `procesoTipo.ts` determina qué bloques mostrar según el tipo de proceso.
  - Evita confusión cuando aparecían opciones "Pendiente" de servicios no solicitados.
  - Checkpoint: `CHK_2026-01-14_PORTAL-CLIENTE-SERVICIOS-DINAMICOS.md`

- **Homogeneización de Flujos (13 ene 2026):** Se corrigieron inconsistencias entre los flujos de creación de procesos:
  - Flujo Completo (`ClienteFormularioIntegrado.tsx`): Agregado campo `reclutador`, selector de Plaza/CEDI y envío de `clientSiteId`.
  - PuestoProcesoFlow: Agregado selector de Plaza/CEDI, reemplazado select simple por config builder (`ProcesoConfig`).
  - Ahora todos los flujos guardan los mismos datos en los mismos lugares.
  - Checkpoint: `CHK_2026-01-13_HOMOGENEIZACION-FLUJOS.md`

**Estado Anterior (18/12/2025)**

- **Incidente Resuelto:** El bloqueo de WAF (Cloudflare) en integración con Psicométricas fue temporal y se ha restablecido el servicio.
  - Solucionado error 500 "Candidato sin email" (normalización DB).
  - Corregido estilo de botón en correos (texto blanco).
  - Mejorado manejo de errores en integración Psicométricas (detección de HTML/WAF).
  - UI: normalización visual a MAYÚSCULAS (con excepciones en campos de entrada).
  - UI: override de preflight/utilidades para que menú/botones/selects hereden MAYÚSCULAS.
  - UI: etiqueta ILA ajustada a “ILA (INVESTIGACION LABORAL)”.
  - UI: normalización de visualización para registros históricos: “Integral de antecedentes” → “Investigacion Laboral”.
  - UI: Flujo Rápido (Candidato → Proceso) permite agregar Cliente y Plazas (alta de plaza desde Plaza/CEDI).
  - UI: Listado de Procesos soporta ordenamiento por Fecha de Recepción.
  - Build: se desbloquea build Vite al agregar `rollup` (evita deploy de artefactos stale).
  - UI: CandidatoDetalle corrige crash en consentimiento (`buildConsentUrl` indefinido) al abrir detalles.
  - API: Se agregó logging de errores tRPC con `requestId` y se endureció `workHistory.generateIaDictamen` para evitar 500 no transformables (Mini dictamen IA).
  - **Mini Dictamen IA (19 dic):** Mapeo automático de `esRecomendable` (conclusión) → `resultadoVerificacion` (tabla). Botón mini dictamen deshabilitado hasta `estatusInvestigacion="terminado"`. Tooltip dinámico guía al usuario. Flujo manual: marcar como "FINALIZADO" → habilita botón → presionar genera mini dictamen analizando toda la info del empleo.
  - UI: Listado de Candidatos agrega columna **Fecha registro** (usa `createdAt`) y permite ordenamiento.
  - UI: CandidatoDetalle agrega acción **Editar autocaptura** (abre Self-Service) y hace más visible el bloque de estado/revisión.
  - UI: CandidatoDetalle muestra tooltips aunque el botón esté deshabilitado (ej. “Aún no hay captura para revisar”).
  - UI: CandidatoDetalle en “Perfil extendido” muestra % de completitud y oculta secciones/campos vacíos.
- **Hosting:** `https://integra-rh.web.app/` operativo.
- Hosting activo en `https://integra-rh.web.app/` sirviendo `integra-rh-manus/dist/public`; CORS habilitado para ese dominio.
- Autenticación: logout limpia Firebase + sesión local y redirige al login; login refresca ID token tras Google/password.
- Backend: contexto auth tolerante a fallos de DB y crea usuario efímero con claims; soporte Cloud Run (socket `/cloudsql/...`) y Dockerfile multistage.
- Build: `pnpm run build` usa `NODE_ENV=production`; `firebase.json` apunta a `dist/public`.
- Se mantienen: invitaciones #WhatsApp, SendGrid operativo, Admin SDK configurado, migración `users.whatsapp` aplicada.
- Portal de Cliente: acceso mediante enlace con token (`clientAccessTokens` + `clientPortal.listDataByToken`), dashboard resumido por procesos/candidatos y branding principal Sinergia RH (Soportado por Integra-RH).
- Portal de Cliente: `candidates.getById` permite ver expediente completo con `ClientToken` (evita 403 por permisos internos en enlaces compartidos).

**Cambios Clave**

- `server/db.ts`: Fix normalización `execute` para `getCandidateByPsicoClave` (evita error 500 por email undefined).
- `server/integrations/sendgrid.ts`: Estilos `!important` para botones de correo (texto blanco).
- `server/integrations/psicometricas.ts`: Headers anti-bot y detección de WAF.
- `client/src/_core/hooks/useAuth.ts`: logout sincroniza Firebase, limpia tokens cliente y redirige.
- `client/src/components/DashboardLayout.tsx`: botón de salir en móvil/desktop, menú admin por defecto hasta conocer rol.
- `client/src/pages/Login.tsx`: usa `AuthContext` (Firebase), refresca idToken en Google y password.
- `server/_core/context.ts`: auth resiliente; cae a user efímero con claims si falla DB.
- `server/_core/index.ts`: CORS para `https://integra-rh.web.app`.
- `server/_core/index.ts`: Propaga `x-request-id` como header de respuesta (correlación navegador ↔ logs Cloud Run).
- `server/_core/index.ts`: Log estructurado de errores tRPC (incluye `requestId`) para diagnóstico de 500.
- `server/_core/index.ts`: Endpoint REST `/api/candidate-save-full-draft` para autosave completo con merge inteligente.
- `server/routers/candidateSelf.ts`: Schema actualizado para `aceptoAvisoPrivacidad` y merge `perfilDetalle.consentimiento` en autosave.
- `server/routers/workHistory.ts`: Hardening en generación de mini dictamen IA (manejo de errores y logging) para evitar fallas no transformables en el cliente.
- `integra-rh-manus/client/src/pages/CandidatoSelfService.tsx`: getDraftPayload() envía TODOS los campos con `|| ""` (nunca null/undefined) para garantizar sync.
- `integra-rh-manus/client/src/pages/ReviewAndCompleteDialog.tsx`: handleSave() incluye `capturadoPor: "analista"` al editar historial laboral.
- `integra-rh-manus/client/src/pages/Candidatos.tsx`: Columna "Fecha registro" (campo `createdAt`) y sort en listado.
- `integra-rh-manus/client/src/pages/CandidatoDetalle.tsx`: Badge "✅ ACEPTÓ TÉRMINOS (fecha)" desde `perfilDetalle.consentimiento`; badge "(editado)" cuando `capturadoPor="analista"`.
- `integra-rh-manus/client/src/pages/CandidatoDetalle.tsx`: Botón "Editar autocaptura" (abre Self-Service) y visibilidad del bloque "Estado de la captura".
- `integra-rh-manus/scripts/test-sync.mjs`: Test de integración sintética que valida flujo de sincronización (7/7 PASS).
- `server/routers/auth.ts`: `logout` no-op para compatibilidad con el hook.
- `server/db.ts`: detección Cloud Run con pool por socket `/cloudsql/integra-rh:us-central1:integra-rh-v2-db-dev`; TCP local.
- `firebase.json`: hosting desde `integra-rh-manus/dist/public`.
- `package.json`: build con `NODE_ENV=production`; nuevo `Dockerfile` multistage para Cloud Run.
- `integra-rh-manus/package.json`: añade `rollup` como `devDependency` para asegurar `pnpm run build`.
- `integra-rh-manus/client/src/index.css`: `text-transform: uppercase` global (con excepciones para inputs/código).
- `integra-rh-manus/client/src/lib/procesoTipo.ts`: “ILA (INVESTIGACION LABORAL)”.
- Migración y soporte WhatsApp siguen en `drizzle/0012_tan_ezekiel_stane.sql` y `scripts/fix-users-whatsapp.ts`.
- `integra-rh-manus/scripts/seed-demo.ts`: genera/actualiza dataset demo (cliente Sycom, puesto, candidato con psico JSON/PDF y proceso completo) usando el correo `frank.saavedra.marin@gmail.com`.

**Cómo correr**

- Server dev: `pnpm tsx watch ./integra-rh-manus/server/_core/index.ts` (desde la raíz o dentro del folder del manus).
- Test SendGrid: `cd integra-rh-manus && pnpm tsx ./scripts/sendgrid-test.ts correo@destino.com`.
- Build/hosting: `cd integra-rh-manus && pnpm run build` y `firebase deploy --only hosting`.
- Seed demo: `cd integra-rh-manus && pnpm tsx scripts/seed-demo.ts` (idempotente; refresca cliente/panel de Paula).

**Pendiente / Recomendado**

- Verificar en Firebase Console que esté habilitado Google Sign-in (Auth → Sign-in method → Google) si se usará.
- Validar end-to-end: login/logout en `https://integra-rh.web.app/` y flujo de invitación (correo + WA).
- Re-deploy Hosting tras build exitoso: `cd integra-rh-manus && pnpm run build` y luego `firebase deploy --only hosting` (para que sirva los nuevos assets hasheados).
- Opcional: máscara/validación visual para WhatsApp; por ahora flexible (placeholder `+52XXXXXXXXXX`).
- Reenvío de invitación: hoy el botón “Reenviar invitación” reenvía vía proveedor Psicométricas (endpoint `/reenviarInvitacion`) y no por SendGrid; si se espera reenvío por correo INTEGRA, implementar `PVM-INT-API-03`.
- Opcional: vistas/roles — revisar restricciones de cliente vs admin en secciones sensibles.
- Opcional: healthcheck/metrics + RBAC base (PVM-OBS/PVM-SEC).

**Checkpoint**

- Commit y tag previos: `checkpoint/20251102-1856-whatsapp-users-sendgrid` (ver `Checkpoints/cp-20251102-1856-whatsapp-users-sendgrid.md`).
- Checkpoint intermedio: `checkpoint/20251119-1850-auth-cors-cloudrun` (este documento).
- Checkpoint nuevo: `checkpoint/20251121-1545-client-portal-token` (ver `Checkpoints/CHK_2025-11-21_1545.md`).
- Checkpoint actual: `checkpoint/20251216-0330-fix-email-waf` (ver `Checkpoints/CHK_2025-12-16_0330-fix-email-waf-diagnosis.md`).
- **Checkpoint Sincronización (23 dic 2025):** `CHK_2025-12-23_FASE-4-PROBADA-E2E.md` — Validación de flujo bidireccional self-service ↔ panel analista con 7 tests de integración (7/7 PASS).

- Checkpoint nuevo (28 ene 2026): `CHK_2026-01-28_INVESTIGACION-LOCALSTORAGE.md`.

### Mejoras de DX (Developer Experience)
- `[ ]` DX-AG-01: Validar agente DEBY (Deep Debugging) con un caso real de error.

