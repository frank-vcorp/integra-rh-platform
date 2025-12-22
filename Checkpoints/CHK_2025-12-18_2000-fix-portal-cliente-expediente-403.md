# Checkpoint — Fix 403 Portal Cliente (Expediente Completo)

**Fecha:** 2025-12-18
**Responsable:** SOFIA
**Contexto:** Al abrir el enlace “VER EXPEDIENTE COMPLETO” desde el portal de cliente, el backend respondía 403/permiso (mensaje observado: `You do not have required permission (10002)`), bloqueando `candidates.getById`.

## Objetivo
- Permitir que el portal cliente consulte `candidates.getById` usando `Authorization: ClientToken ...` sin caer en validaciones de permisos internos.

## Cambios realizados
- Backend: `integra-rh-manus/server/routers/candidates.ts`
  - `candidates.getById` pasa de `protectedProcedure` a `publicProcedure`.
  - Si existe `ctx.user`:
    - Cliente: retorna `null` si el candidato no pertenece al `clientId`.
    - Interno: requiere `hasPermission("candidatos","view")`.
  - Si NO existe `ctx.user`: intenta validar `ClientToken` directo desde header y aplica la misma validación de pertenencia.
  - Si no hay auth válida: `UNAUTHORIZED` con `UNAUTHED_ERR_MSG`.

- Frontend: `integra-rh-manus/client/src/pages/ClienteCandidatoDetalle.tsx`
  - Cambia `processes.list` + filtro local por `processes.getByCandidate`.

- Docs: `PROYECTO.md`
  - Nota en “Estado Actual” sobre el fix de acceso por `ClientToken`.

## Verificación
- `pnpm test` en `integra-rh-manus` no encuentra archivos de test (sale con código 1). No hay suite automatizada disponible para validar.

## Deploy (Producción)
- Cloud Run service: `api` (region `us-central1`, project `integra-rh`).
- Comando:
  - `gcloud run deploy api --source . --region=us-central1 --project=integra-rh --platform=managed --quiet`
- Resultado:
  - Revisión: `api-00051-k5n` (100% tráfico).
  - URL: `https://api-559788019343.us-central1.run.app`

## Próximos pasos
- Desplegar API (Cloud Run) y validar en producción:
  - Abrir enlace de acceso cliente → navegar a “VER EXPEDIENTE COMPLETO” → confirmar que carga candidato sin 403.
  - Verificar también `workHistory.getByCandidate` y `processes.getByCandidate` desde el mismo flujo.
