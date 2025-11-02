**ID:** `PVM-WEB-01`
**Título:** `Inicializar Vite + React (Web)`

**Resumen:**
Crear el frontend base con Vite + React + TypeScript, preparado para consumir la API tRPC, con estructura mínima de rutas y layout.

**Criterios de Aceptación (DoD):**
1. Proyecto Vite React configurado en `integra-rh-manus/client/` con TypeScript y ESLint opcional.
2. Estructura: `src/main.tsx`, `src/App.tsx`, `src/pages/{Home,Clientes,Login}.tsx`, `src/lib/trpc.ts` (cliente tRPC).
3. Routing básico (wouter ya está presente). Navbar sencilla y layout responsivo mínimo.
4. Cliente tRPC apunta a `/trpc` en dev (PVM) y `/api/trpc` en build (_core), configurable vía `VITE_API_BASE`.
5. Script `pnpm dev` levanta frontend y se conecta a la API con CORS habilitado.

**Fuera de Alcance:** Diseño final UI; componentes complejos; i18n.

