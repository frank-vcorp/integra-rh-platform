# DICTAMEN TÉCNICO: Fix: Inconsistencias en nombres de Plazas y Responsables en listado de Procesos

- **ID:** FIX-20260217-01
- **Fecha:** 2026-02-17
- **Solicitante:** Usuario (via Prompt)
- **Estado:** ✅ VALIDADO

### A. Análisis de Causa Raíz
El backend `getAllProcesses` (y funciones relacionadas) ya retorna los campos `siteName` y `responsableName` mediante JOINs SQL.
Sin embargo, el componente Frontend `Procesos.tsx` ignora estos campos pre-calculados y utiliza funciones helper (`getSiteName`, `getResponsableName`) que intentan realizar búsquedas manuales en listas (`clientSitesByClient`, `users`).
Estas búsquedas fallan porque:
1. `clientSitesByClient` solo carga plazas del cliente *seleccionado* en el filtro superior, no todas las plazas de todos los procesos listados.
2. `users` puede no estar completamente cargado o actualizado.
3. El componente está pasando el ID (e.g. `process.clientSiteId`) a funciones que esperan el objeto `process` completo, provocando que la propiedad `process.siteName` sea `undefined`.

### B. Justificación de la Solución
Se reemplaza el uso de los helpers complejos por acceso directo a las propiedades que ya vienen del backend: `process.siteName` y `process.responsableName`.
Esto elimina la dependencia de listas auxiliares incompletas y mejora el rendimiento al reducir cálculos en el renderizado.
Se modificará el renderizado de la tabla para usar: `process.siteName || "-"` y `process.responsableName || "-"`.

### C. Instrucciones de Handoff para SOFIA
Modificar `client/src/pages/Procesos.tsx`:
1. Eliminar o comentar las funciones `getSiteName` y `getResponsableName`.
2. En el renderizado de la tabla, sustituir las llamadas a estas funciones por acceso directo a `process.siteName` y `process.responsableName`.
