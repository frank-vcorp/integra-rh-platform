# SPEC-indice-fecha-recepcion-procesos

- ID: ARCH-20260324-02
- Fecha: 2026-03-24
- Estado: aplicado-parcial

## Problema
La tabla processes no tenía índice sobre fechaRecepcion. Las consultas operativas ordenadas por ese campo forzaban ordenamientos costosos y contribuían al error de sort memory observado en producción y local.

## Objetivo
Agregar un índice dedicado sobre fechaRecepcion para reducir el costo del ordenamiento y estabilizar los listados existentes, incluso antes de que el backend optimizado quede desplegado.

## Decisión
Agregar el índice idx_processes_fechaRecepcion en schema.ts y como migración SQL explícita.

## Alcance
- drizzle/schema.ts
- drizzle/0025_add_processes_fecha_recepcion_index.sql
- drizzle/meta/_journal.json

## Criterios de aceptación
- El esquema declara el índice.
- Existe migración SQL trazable.
- La base de datos remota puede confirmar la presencia del índice tras ejecución controlada.

## Notas
El deploy de Cloud Run quedó bloqueado por reautenticación de gcloud en este entorno. El índice se considera la mitigación estructural principal mientras se reanuda el deploy del backend.
