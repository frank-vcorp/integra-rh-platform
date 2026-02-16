# Checkpoint - Actualización de Estatus de Proceso

## Cambios Realizados
1. **Frontend (Admin - ProcesoDetalle.tsx)**:
   - Se actualizaron las etiquetas de estatus a Mayúsculas.
   - Se agregaron los nuevos estatus: "ENTREVISTADO" y "NO ENTREVISTADO".
   - Se reordenó la lista de selección.

2. **Frontend (Cliente - ClienteDashboard.tsx / ClienteProcesoDetalle.tsx)**:
   - Se actualizaron las etiquetas (`estatusLabels`) para mostrar los estatus en Mayúsculas.
   - Se mantiene consistencia con la vista de Admin.

3. **Backend (API)**:
   - Se actualizó el validador `zod` en `server/routers/processes.ts` para aceptar los nuevos valores en `updateStatus`.
   - Se actualizó `drizzle/schema.ts` agregando los valores al enum `estatusProceso`.

4. **Base de Datos**:
   - Se generó la migración `drizzle/0007_smart_roxanne_simpson.sql`.
   - **NOTA CRÍTICA 1**: La aplicación de la migración (`pnpm db:push`) falló por timeout de conexión (`ETIMEDOUT`).
   - **NOTA CRÍTICA 2**: Se detectó una inconsistencia en el historial de migraciones (`drizzle/`): existen archivos hasta `0021_...` pero el journal local (`_journal.json`) parece detenerse en `0007`. Esto podría requerir una reparación manual del historial de migraciones (`drizzle-kit drop` o similar) antes de intentar `db:push` en un entorno seguro.

## Próximos Pasos
- Ejecutar `pnpm db:push` desde un entorno autorizado para aplicar el cambio de columna ENUM en la tabla `processes`.
- Verificar flujo completo de cambio de estatus en Staging/Prod.
