**ID:** `PVM-DATA-01`
**Título:** `Script de Migración de Datos Inicial (Clientes y Candidatos)`

**Resumen:**
Crear un script en TypeScript que lea los datos maestros del cliente desde el archivo `context/Brief_del_cliente/Base de Datos - Plataforma Paula León.xlsx`. El script se enfocará en migrar las hojas de "CLIENTES" y "CANDIDATOS" a sus respectivas tablas en la nueva base de datos (`clients` y `candidates`) usando Drizzle.

**Criterios de Aceptación (DoD):**
1.  Crear un nuevo archivo de script: `integra-rh-manus/scripts/migrate-from-excel.ts`.
2.  Añadir e instalar una librería para la lectura de archivos Excel (ej. `xlsx`).
3.  Implementar la lógica para leer las hojas "CLIENTES" y "CANDIDATOS" del archivo `.xlsx`.
4.  Mapear las columnas relevantes del Excel a los campos definidos en `drizzle/schema.ts` para `clients` y `candidates`.
5.  Implementar una estrategia para evitar duplicados. Para esta migración inicial, se puede optar por limpiar las tablas (`TRUNCATE`) antes de la inserción.
6.  El script debe registrar en la consola el progreso y los resultados (ej: "Leídos X clientes del Excel. Insertados Y clientes en la BD.").
7.  El script debe conectarse a la base de datos utilizando las credenciales de desarrollo existentes.

**Fuera de Alcance para esta Tarea:**
*   Migración de datos de procesos, historial laboral, psicometrías o cualquier otra entidad que no sea Clientes y Candidatos.
*   Limpieza o transformación compleja de los datos de origen. Se migrarán "tal cual" en la medida de lo posible.
*   Creación de una interfaz de usuario para la migración.