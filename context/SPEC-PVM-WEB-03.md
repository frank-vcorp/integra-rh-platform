**ID:** `PVM-WEB-03`
**Título:** `Listado de Clientes (Web)`

**Resumen:**
Construir la página para listar clientes consumiendo `clients.list` vía tRPC, con tabla, búsqueda local y estados de carga/error.

**Criterios de Aceptación (DoD):**
1. Página `Clientes.tsx` usa `trpc.clients.list.useQuery()` con React Query.
2. Tabla con columnas mínimas: `nombreEmpresa`, `ubicacionPlaza`, `contacto`, `email`.
3. Barra de filtro local (por texto) y paginación simple (client-side) si >50 registros.
4. Estados de UI: loading, error (muestra mensaje), empty state.
5. Al hacer clic en fila navega a detalle `/clientes/:id`.

**Fuera de Alcance:** Edición/CRUD completo; filtros avanzados; exportación CSV.

