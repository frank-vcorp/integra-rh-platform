# SPEC-estabilizacion-listado-procesos

- ID: ARCH-20260324-01
- Fecha: 2026-03-24
- Estado: aplicado

## Problema
El endpoint de listado de procesos ejecutaba un select amplio sobre la tabla processes, incluyendo columnas JSON pesadas, unido a ordenamiento por fechaRecepcion. En producción y local esto detonaba errores de base de datos equivalentes a agotamiento de memoria de ordenamiento, lo que se manifestaba en el frontend como fallos de tRPC y aparente perdida de procesos.

## Objetivo
Mantener estable el listado de procesos sin tocar el esquema de base de datos en esta intervención.

## Decisión
Reducir la consulta de listado a una proyección explícita de columnas de resumen necesarias para vistas operativas y clientes.

## Alcance
- server/db.ts
- funciones getAllProcesses y getProcessesByClient

## Criterios de aceptación
- El listado general responde sin error localmente.
- El listado por cliente responde sin error localmente.
- No se altera getProcessById ni el detalle completo del proceso.

## Validación
Reproducción local posterior al cambio:
- getAllProcesses: ok
- getProcessesByClient: ok

## Notas
Queda como mejora posterior agregar índice sobre fechaRecepcion mediante migración controlada, pero no se incluye aquí por tratarse de cambio de esquema.
