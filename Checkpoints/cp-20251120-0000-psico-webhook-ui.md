# Checkpoint 2025-11-20 — Psicométricas (webhook/UI)

Estado actual
- Hosting desplegado (`https://integra-rh.web.app`, assets/index-C_cMEk1c.js); backend `api-00013-dll` en Cloud Run sin secret de webhook.
- Webhook Psicométricas apuntar a `https://api-559788019343.us-central1.run.app/api/webhooks/psicometricas` (sin header). Credenciales PSICOMETRICAS_TOKEN/PASSWORD presentes.
- “Ver resultados” usa query GET y refetch de candidato tras consultar; enlaces de invitación PSICO sin click-tracking (SendGrid).
- “Guardar reporte PDF” funcional: descarga y guarda en Documentos tipo PSICOMETRICO (permiso signBlob corregido).

Cambios aplicados (archivos clave)
- `client/src/pages/CandidatoDetalle.tsx`: consultarResultados como query/refetch y refresco del candidato al cerrar.
- `server/integrations/sendgrid.ts`: deshabilitado click-tracking en invitación psicométrica.

Pendientes
- Validar que Psicométricas envíe el webhook (estatus pase a “Completado” y JSON se persista) tras completar la batería.
- Reasignación al mismo candidato: revisar respuesta de la API (posible clave ya existente) y decidir si reutilizar/actualizar clave.
- Si el webhook no llega, usar “Ver resultados” para actualizar estatus y “Guardar reporte PDF” para adjuntar el archivo manualmente.
