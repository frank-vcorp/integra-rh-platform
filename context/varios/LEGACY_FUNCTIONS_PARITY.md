# Paridad Firebase Functions → API tRPC (Nueva Arquitectura)

Este documento mapea las funciones existentes en `functions/index.js` (prototipo inicial) a su equivalente en la nueva API tRPC bajo `integra-rh-manus/server`.

## Mapa de funciones
- asignarPruebasPsicometricas → `trpc.psicometricas.assign`
  - Estado: Implementado (asignación, persistencia de clave, correo vía SendGrid).
- reenviarInvitacion → `trpc.psicometricas.resend`
  - Estado: Implementado (reenvío de correo).
- webhookResultadosPsicometricas → `POST /api/webhooks/psicometricas`
  - Estado: Endpoint creado; faltan reglas de actualización automática (estatus/JSON/PDF) según payload.
- listUsers → (por definir) `trpc.admin.listUsers`
  - Estado: Pendiente. Decidir fuente (Firebase Auth vs DB).
- listUsersHttp → (por definir) `GET /api/admin/users` o `trpc.admin.listUsers`
  - Estado: Pendiente.
- manageUserRole → `trpc.admin.updateUserRole`
  - Estado: Pendiente (definir RBAC y origen de roles).
- viewSocioeconomicStatus → `trpc.candidates.getSocioeconomicStatus`
  - Estado: Pendiente (definir origen de datos/reporte).
- generateShareableLink → `trpc.documents.createShareLink` o `trpc.candidates.createShareLink`
  - Estado: Pendiente (alcance: documentos específicos vs expediente completo; expiración y permisos).

## Notas y decisiones
- Webhook Psicométricas: completar parseo y side-effects:
  - Actualizar estatus del candidato/proceso.
  - Guardar JSON de resultados en expediente.
  - Descargar PDF y subir a Storage, registrar en `documents`.
- Admin/Usuarios: proponer rol base (admin/cliente) con guardas en UI y middleware.
- Enlaces compartibles: usar URLs firmadas de GCS para documentos; para vistas, emitir token temporal (JWT) con scopes y expiración.

## Próximos pasos sugeridos
1) Definir esquema y endpoints para Admin Users (listar/rol).
2) Completar webhook Psicométricas y pruebas.
3) Implementar creación de enlaces compartibles con expiración y auditoría básica.

