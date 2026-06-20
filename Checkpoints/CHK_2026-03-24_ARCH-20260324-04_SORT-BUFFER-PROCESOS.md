# Checkpoint — ARCH-20260324-04
**Fecha:** 2026-03-24
**Agente:** INTEGRA — Arquitecto
**Objetivo:** Restablecer operatividad del listado de procesos en producción.

## Resumen
Se confirmó que la consulta legacy de procesos seguía fallando por `ER_OUT_OF_SORTMEMORY` aun con el índice en `fechaRecepcion`. Como mitigación operativa inmediata en la base remota, se elevó `sort_buffer_size` global de `262144` a `4194304`.

## Evidencia
- Índice activo: `idx_processes_fechaRecepcion`
- `SHOW GLOBAL VARIABLES LIKE 'sort_buffer_size'` => `4194304`
- Consulta ancha legacy validada en conexión nueva:
  - `count: 55`
  - `firstId: 86`

## Estado resultante
- La base ya puede responder la consulta vieja que estaba rompiendo el listado de procesos.
- El deploy de Cloud Run/Hosting sigue pendiente por permisos de autenticación, pero la incidencia funcional principal queda mitigada en producción desde la base de datos.

## Nota
El código optimizado de `server/db.ts` sigue siendo la solución correcta de largo plazo y debe desplegarse cuando se normalicen los permisos de Cloud Build/Firebase Hosting.
