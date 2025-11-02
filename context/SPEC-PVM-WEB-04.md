**ID:** `PVM-WEB-04`
**Título:** `Detalle de Cliente (Web)`

**Resumen:**
Crear la página de detalle de un cliente que consulta `clients.get` y lista sus `posts` asociados usando `posts.listByClient`.

**Criterios de Aceptación (DoD):**
1. Ruta `/clientes/:id` obtiene `id` (número) y consulta `clients.get`.
2. Sección de información del cliente y sección de Puestos consumiendo `posts.listByClient({ clientId: id })`.
3. Manejo de estados: loading, not found (404 lógica con mensaje), error.
4. Navegación de retorno a `/clientes` y links a detalle de puesto (placeholder).
5. Prueba manual: IDs válidos muestran datos; inválidos muestran `NOT_FOUND` y UI de 404.

**Fuera de Alcance:** CRUD de cliente/puestos; acciones administrativas.

