# Checkpoint 20251120-0000 — psico webhook & UI

## Hecho hoy
- Hosting desplegado con últimas builds; corrección en “Ver resultados” (psicometricas.consultarResultados ahora GET con refetch y refresca el candidato) y enlace de invitación sin click-tracking (SendGrid).
- Webhook psico ya sin secret: endpoint real `https://api-559788019343.us-central1.run.app/api/webhooks/psicometricas`. Variables PSICOMETRICAS_TOKEN/PASSWORD cargadas en la revisión `api-00013-dll`.
- Botón “Guardar reporte PDF” funcionando (PDF se guarda en Documentos tipo PSICOMETRICO); se resolvió permiso signBlob dando rol adecuado al service account.
- Migración/estado: Cloud Run `api` activo; hosting https://integra-rh.web.app sirve `assets/index-C_cMEk1c.js`.

## Pendientes
- Confirmar webhook de Psicométricas: hoy hubo 401 por secret; ya se quitó. Falta validar que el proveedor envíe el POST y que estatus pase a “Completado” automáticamente.
- Reasignación al mismo candidato: revisar respuesta de la API (posible clave duplicada). Falta ajustar la lógica según el mensaje que devuelva Psicométricas.
- Estatus/JSON: si el webhook no llega, usar “Ver resultados” para actualizar estatus y “Guardar reporte PDF” para subir el archivo.

## URLs/config
- Webhook Psico: `https://api-559788019343.us-central1.run.app/api/webhooks/psicometricas` (sin header).
- TRPC host (backend): `https://api-559788019343.us-central1.run.app/api/trpc/*` (usado por front).
- Hosting: https://integra-rh.web.app

