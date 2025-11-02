**ID:** `PVM-SEC-01`
**Título:** `RBAC base (admin/cliente)`

**Resumen:**
Establecer control de acceso por roles en la API para distinguir permisos de administradores y clientes, reutilizando `protectedProcedure` y añadiendo `adminProcedure`.

**Criterios de Aceptación (DoD):**
1. Definir `adminProcedure` a partir de `protectedProcedure` que valide `ctx.user.role === 'admin'` (PVM o _core según ruta usada).
2. Endpoints de administración (crear/editar/eliminar clientes, puestos, candidatos) usan `adminProcedure`.
3. Endpoints de cliente restringen datos al `clientId` del usuario autenticado.
4. Respuestas de error estandarizadas: `UNAUTHORIZED` (no autenticado), `FORBIDDEN` (rol insuficiente).
5. Checklist de pruebas manuales con usuario admin y usuario cliente.

**Fuera de Alcance:** Jerarquías de permisos granulares; auditoría de cambios.

