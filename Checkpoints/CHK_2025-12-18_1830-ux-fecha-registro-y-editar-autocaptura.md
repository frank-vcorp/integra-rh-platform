# Checkpoint: UX Candidatos — Fecha registro + Editar autocaptura

**Fecha:** 18 de diciembre de 2025
**Estado:** Implementado en UI y desplegado a Hosting.

## 1. Objetivo

Mejorar la operación de analistas:

- Ver la **fecha de registro** del candidato en el listado y poder **ordenar** por esa fecha.
- Permitir **corregir la autocaptura** (self-service) y facilitar la acción de **marcar como revisado**.

## 2. Cambios aplicados

### Frontend

- `integra-rh-manus/client/src/pages/Candidatos.tsx`
  - Se agregó columna **Fecha registro** (usa `candidate.createdAt`).
  - Se habilitó ordenamiento por la nueva clave `fechaRegistro` (por defecto DESC).

- `integra-rh-manus/client/src/pages/CandidatoDetalle.tsx`
  - Se agregó botón **Editar autocaptura** (genera token y abre el formulario self-service en nueva pestaña).
  - El bloque **Estado de la captura** se muestra de forma más visible (independiente de que exista o no `selfServiceUrl`).
  - Tooltip en acciones deshabilitadas: ahora se ve “Aún no hay captura para revisar” aunque el botón esté disabled.
  - “Perfil extendido”: se muestra % de completitud (barra + porcentaje) y se ocultan secciones/campos sin datos para evitar bloques vacíos.

## 3. Notas técnicas

- El campo `investigacionProgreso` llega en runtime desde el backend, pero no está tipado en el cliente; para evitar fallas de TypeScript se accede de forma tolerante en el sort.

## 4. Verificación

- `npm run check` (TypeScript) sigue fallando por errores preexistentes del repo, pero:
  - Ya no reporta errores en `Candidatos.tsx` tras el ajuste.

## 5. Pendientes
- Si se requiere edición *in-app* (sin abrir self-service), habrá que definir UI interna y endpoints de actualización de `perfilDetalle`.

## 6. Deploy

- `cd integra-rh-manus && pnpm run build`
- `firebase deploy --only hosting`
