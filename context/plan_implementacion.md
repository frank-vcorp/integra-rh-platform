# Plan de Acción: Múltiples Periodos Laborales

He analizado tu solicitud y he preparado el siguiente plan:

1.  **Backend (`workHistory.ts`)**: Verificar y ajustar el esquema `saveInvestigation` para asegurar que `periodo.periodos` acepte una lista de objetos con fechas, puestos y salarios.
2.  **Frontend (`CandidatoDetalle.tsx`)**:
    *   Localizar el modal de investigación (Bloque 1: Periodo Laboral).
    *   Modificar la interfaz para permitir agregar dinámicamente filas de periodos (Inicio, Fin, Puesto, Salario).
    *   Asegurar que estos datos se guarden correctamente en la estructura JSON del backend.
    *   Actualizar la visualización en la tarjeta de resumen para mostrar todos los periodos registrados.

Estoy procediendo a verificar el código actual para aplicar estos cambios.
