# Checkpoint - Comentarios en Dictamen de Proceso

## Cambios Realizados
1.  **Base de Datos**:
    *   Se agregó la columna `comentarioCalificacion` (TEXT) a la tabla `processes`.
    *   Migración generada: `drizzle/0008_daily_korath.sql`.
    *   Migración aplicada MANUALMENTE a la BD de producción usando scripts.

2.  **Backend (API)**:
    *   Se actualizó el router `processes.updateCalificacion` en `server/routers/processes.ts`.
    *   Ahora acepta el parámetro opcional `comentarioCalificacion` y lo guarda en la BD.

3.  **Frontend (ProcesoDetalle.tsx)**:
    *   Se refactorizó el selector de calificación para usar estado controlado (`useState`).
    *   Se agregó un campo `Textarea` que se muestra condicionalmente cuando la calificación es "Recomendable" o "Con Reservas".
    *   Se actualizó la llamada mutation para enviar ambos datos.

## Próximos Pasos
- Desplegar a Cloud Run (`api`).
- Verificar en producción que el campo de comentarios aparezca y se guarde correctamente.
