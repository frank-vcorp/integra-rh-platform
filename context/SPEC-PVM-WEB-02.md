**ID:** `PVM-WEB-02`
**Título:** `Login con Firebase Auth (Web)`

**Resumen:**
Implementar autenticación en el frontend con Firebase Auth (Google y/o Email Link) y propagar el ID Token en el cliente tRPC como `Bearer` para acceder a endpoints protegidos.

**Criterios de Aceptación (DoD):**
1. Configurar Firebase Web SDK en el cliente: `src/lib/firebase.ts` usando variables `VITE_FIREBASE_*`.
2. Flujo de login (Google o Email Link). Guardar sesión y exponer hook `useAuth()`.
3. Adjuntar `Authorization: Bearer <idToken>` en el cliente tRPC. Renovación de token transparente.
4. Página `Login` con botón de acceso y feedback de estado; proteger rutas con guard (redirige a `/login`).
5. Endpoint `auth.me` consumido tras login para mostrar datos del usuario.

**Fuera de Alcance:** Roles UI avanzados; recuperación de contraseña por email; multi-tenant UI.

