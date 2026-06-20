# SPEC ARCH-20260520-08

## Titulo
Hotfix de produccion para `users.delete` y `processes.list`

## Contexto
- Produccion presenta error 500 al intentar eliminar usuarios desde `/usuarios`.
- Despues del intento de borrado, la UI tambien reporta 500 en `processes.list`.
- El flujo de borrado actual en [integra-rh-manus/server/routers/users.ts](../../integra-rh-manus/server/routers/users.ts) delega en [integra-rh-manus/server/db.ts](../../integra-rh-manus/server/db.ts) y ejecuta un `DELETE` directo sin prevalidacion de dependencias.
- El esquema actual obliga `candidates.analistaAsignadoId` en [integra-rh-manus/drizzle/schema.ts](../../integra-rh-manus/drizzle/schema.ts), por lo que borrar un usuario referenciado puede fallar por FK o por integridad de dominio.
- `processes.list` falla en produccion con un `SELECT` que no coincide exactamente con la version local del query, por lo que debe tratarse como posible drift de esquema o desalineacion de runtime y cerrarse con evidencia, no con supuestos.

## Problema
1. `users.delete` devuelve 500 en lugar de una respuesta de negocio controlada cuando el usuario tiene dependencias activas.
2. `processes.list` devuelve 500 en produccion y rompe pantallas dependientes del listado de procesos.

## Objetivo
Restablecer estabilidad operativa en produccion con el menor cambio posible:
- impedir 500 opacos en `users.delete`
- aislar y corregir la causa real de `processes.list`
- validar el fix con evidencia ejecutable o logs precisos

## Hipotesis de Trabajo
1. `users.delete` falla porque el usuario a borrar sigue referenciado desde `candidates` y posiblemente `processes`.
2. `processes.list` falla por drift entre el esquema esperado por el backend desplegado y la base productiva, o por desalineacion entre bundle/runtime y codigo actual.

## Alcance
- Backend tRPC y acceso a datos del flujo de usuarios/procesos.
- Manejo de errores de negocio en `users.delete`.
- Instrumentacion o ajuste minimo necesario para obtener el error SQL exacto de `processes.list` si aun no esta expuesto claramente.
- Correccion minima del query o del acceso a datos de `processes.list` una vez confirmada la causa real.

## No Alcance
- Redisenar modelo de usuarios/analistas.
- Migrar deuda historica completa de Drizzle/migraciones.
- Cambios amplios de frontend fuera de mostrar correctamente el error ya controlado si hiciera falta.

## Archivos Candidatos
- [integra-rh-manus/server/routers/users.ts](../../integra-rh-manus/server/routers/users.ts)
- [integra-rh-manus/server/db.ts](../../integra-rh-manus/server/db.ts)
- [integra-rh-manus/server/routers/processes.ts](../../integra-rh-manus/server/routers/processes.ts)
- [integra-rh-manus/drizzle/schema.ts](../../integra-rh-manus/drizzle/schema.ts)
- Checkpoint en `context/checkpoints/`

## Criterios de Aceptacion
1. `users.delete` no devuelve 500 cuando el usuario tiene dependencias; devuelve error controlado y accionable con mensaje claro.
2. El backend valida al menos referencias en `candidates` y `processes` antes de intentar el `DELETE`, o documenta con evidencia por que una de esas tablas no aplica.
3. `processes.list` deja de devolver 500 en el entorno validado por SOFIA, o queda identificado con evidencia exacta el error SQL y el desajuste de esquema correspondiente.
4. La validacion posterior incluye una comprobacion ejecutable o de logs para ambos endpoints.
5. Se genera checkpoint con la evidencia del hotfix y cualquier riesgo residual.

## Estrategia Recomendada
1. Agregar una prevalidacion en `users.delete` que cuente dependencias referenciales y lance un error de negocio (`BAD_REQUEST` o equivalente) antes del `DELETE`.
2. Reproducir `processes.list` con el mismo contexto de autenticacion o mediante logs para capturar la excepcion SQL exacta.
3. Corregir solo el fragmento minimo responsable en `processes.list` y volver a validar el listado.

## Riesgos y Controles
- Riesgo: ocultar el 500 de `users.delete` sin resolver la integridad subyacente.
  - Control: incluir conteo o detalle minimo de dependencias en el error controlado.
- Riesgo: tocar `processes.list` sin evidencia exacta del fallo.
  - Control: exigir validacion por logs o reproduccion concreta antes de cerrar.
- Riesgo: drift entre codigo local y produccion.
  - Control: documentar el commit o revision validada en el checkpoint.

## Handoff a SOFIA
Implementar el hotfix minimo con foco en backend. Prioridad alta a convertir `users.delete` en una operacion segura y explicita. Para `processes.list`, primero cerrar la causa exacta y luego aplicar el cambio minimo que restablezca el listado. Validar antes de cerrar.