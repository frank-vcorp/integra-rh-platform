## Checkpoint CHK_2025-12-05_2300 – Roles, permisos y analista asignado

- Migración completa del backend a un esquema RBAC por módulo/acción.
- Nuevas tablas en MySQL (Railway): `roles`, `role_permissions`, `user_roles` ya en producción.
- `auth.me` ahora devuelve permisos efectivos (`_permissions`) y flag `_isSuperadmin`.
- Helper de cliente `useHasPermission(module, action)` para ocultar/mostrar acciones en UI.
- Procesos:
  - `assertCanEditProcess` valida: solo Superadmin, admins operativos (con `procesos:create|delete`) o el analista asignado pueden editar estado, calificación, panel de detalle, dictamen y visitas.
  - Mutaciones `updateStatus`, `updateCalificacion`, `updatePanelDetail`, `generarDictamen` y todas las de visitas usan ahora `protectedProcedure + requirePermission("procesos"/"visitas","edit")` + `assertCanEditProcess`.
- Historial laboral (`workHistory`):
  - Lectura condicionada a `candidatos:view` para usuarios internos; clientes solo pueden ver sus candidatos.
  - Crear/actualizar/eliminar e investigación telefónica bajo `candidatos:edit`.
- Otros routers:
  - `audit.list` exige `registros:view`.
  - Email y psicométricos ligados a permisos de `candidatos` (view/edit).
  - Enlaces de cliente (`clientAccess`) ligados a permisos de `clientes` (edit/view).
- UI protegida por permisos:
  - **Procesos**: crear/eliminar según `procesos:create/delete`; detalle editable solo cuando `procesos:edit` y backend lo permite.
  - **Clientes**: alta/edición/borrado según `clientes:create/edit/delete`.
  - **Puestos**: alta/edición/borrado según `puestos:create/edit/delete`.
  - **Candidatos**: alta/edición/borrado según `candidatos:create/edit/delete` (ver expediente siempre permitido si tiene acceso al módulo).
  - **Usuarios**: crear/editar/eliminar/invitar según `usuarios:create/edit/delete`.
  - **Encuestadores**: crear/editar/activar/eliminar según `encuestadores:create/edit/delete`.
  - **Pagos**: importar/crear pagos según `pagos:create`; marcar pagado según `pagos:edit`.
- Scripts ejecutados hoy:
  - `npm run build` (cliente + server) – OK.
  - `gcloud run deploy api --source . --region=us-central1 --platform=managed` – servicio `api` actualizado (Cloud Run).
- Firebase Hosting desplegado manualmente después del build para reflejar cambios de UI.

Estado actual: sistema ya operando con roles y permisos, listo para que las usuarias definan/ajusten la matriz desde la pantalla de **Roles y permisos** sin tocar código.*** End Patch***}}} ***!
