## Problema: Acceso por token al panel de cliente (Integra RH)

### 1. Contexto general

- Proyecto: `integra-rh` (monorepo).
- Frontend principal: React + Vite en `integra-rh-manus/client`.
- Backend: API Node/Express + tRPC en `integra-rh-manus/server/_core/index.ts` (build → `dist/index.js`).
- Hosting:
  - Frontend: Firebase Hosting → `https://integra-rh.web.app/`.
  - API: Cloud Run servicio `api` → `https://api-559788019343.us-central1.run.app`.
- Autenticación:
  - Admin / backoffice: Firebase Auth (`Authorization: Bearer <idToken>`).
  - Clientes: token único en tabla `clientAccessTokens` (MySQL/Drizzle) que viaja en el enlace de cliente.

### 2. Flujo esperado de acceso para clientes

1. Admin genera enlace desde el panel (router `clientAccess`):
   - Se inserta un registro en `clientAccessTokens`.
   - URL resultante: `https://integra-rh.web.app/cliente?token=<token>` o `/cliente/<token>`.
2. Cliente abre el enlace (puede ser en incógnito, sin login Firebase).
3. Página `ClienteAcceso.tsx`:
   - Extrae `token` (query o segmento de ruta).
   - Llama a `trpc.clientAccess.validateToken.useQuery({ token })` (endpoint público).
   - Si el token es válido, guarda en `sessionStorage`:
     - `clientAccessToken = <token>`
     - `clientId = <id del cliente>`
   - Dispara evento `clientAuthChanged` y redirige a `/cliente/dashboard`.
4. En `/cliente/dashboard`, el frontend debería usar el token del cliente para consumir:
   - `processes.list` → procesos del cliente.
   - `candidates.list` → candidatos del cliente.
   y mostrar el dashboard sin pedir login.

### 3. Implementación actual relevante

#### 3.1 Envío del token desde el frontend

Archivo: `integra-rh-manus/client/src/main.tsx`

```ts
const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: import.meta.env.VITE_API_URL || "/api/trpc",
      transformer: superjson,
      async headers() {
        const headers: Record<string, string> = {};

        // 1) Admin / backoffice (Firebase)
        const auth = getAuth();
        const user = auth.currentUser;
        if (user) {
          const token = await user.getIdToken();
          headers.Authorization = `Bearer ${token}`;
          return headers;
        }

        // 2) Cliente vía enlace (sin Firebase)
        try {
          const clientToken = sessionStorage.getItem("clientAccessToken");
          if (clientToken) {
            headers.Authorization = `ClientToken ${clientToken}`;
          }
        } catch {}

        return headers;
      },
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});
```

#### 3.2 Contexto tRPC en el backend

Archivo: `integra-rh-manus/server/_core/context.ts`

- `createContext` devuelve `{ req, res, user }`.

1. **Firebase (`Bearer`)**  
   Si el header `Authorization` empieza con `Bearer `:
   - Verifica el ID token con `adminAuth.verifyIdToken`.
   - Busca/crea usuario en tabla `users` (`getUserByOpenId`, `upsertUser`).
   - Construye `user` con rol `admin` o `client` y posible `clientId`.

2. **Token de cliente (`ClientToken`)**  
   Si NO se autenticó por Firebase:
   - Lee de nuevo `Authorization`.
   - Si empieza con `ClientToken `:
     - Extrae el token y llama a `validateClientToken(token)` (`server/auth/clientTokens.ts`).
     - Esta función hace `JOIN clientAccessTokens + clients`, valida expiración y revocación.
     - Si el token es válido, crea un `user` efímero con:
       - `role: "client"`
       - `clientId: client.id`

Resultado esperado: con `Authorization: ClientToken <token>` las rutas `protectedProcedure` deberían ver `ctx.user.role = "client"` y `ctx.user.clientId` con el ID correcto.

#### 3.3 Routers de procesos y candidatos

Archivo: `integra-rh-manus/server/routers/processes.ts`

```ts
export const processesRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    if (ctx.user?.role === "admin") {
      return db.getAllProcesses();
    }
    if (ctx.user?.role === "client" && ctx.user.clientId) {
      return db.getProcessesByClient(ctx.user.clientId);
    }

    const authHeader =
      ctx.req.headers["authorization"] ||
      (ctx.req.headers["Authorization" as any] as string | string[] | undefined);
    const header = Array.isArray(authHeader) ? authHeader[0] : authHeader;

    if (typeof header === "string" && header.startsWith("ClientToken ")) {
      const token = header.slice("ClientToken ".length).trim();
      const { validateClientToken } = await import("../auth/clientTokens");
      const client = await validateClientToken(token);
      if (client) {
        return db.getProcessesByClient(client.id);
      }
    }

    throw new TRPCError({ code: "UNAUTHORIZED", message: "Please login (10001)" });
  }),
  // ...
});
```

Archivo: `integra-rh-manus/server/routers/candidates.ts`

```ts
export const candidatesRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    if (ctx.user?.role === "admin") {
      return db.getAllCandidates();
    }
    if (ctx.user?.role === "client" && ctx.user.clientId) {
      return db.getCandidatesByClient(ctx.user.clientId);
    }

    const authHeader =
      ctx.req.headers["authorization"] ||
      (ctx.req.headers["Authorization" as any] as string | string[] | undefined);
    const header = Array.isArray(authHeader) ? authHeader[0] : authHeader;

    if (typeof header === "string" && header.startsWith("ClientToken ")) {
      const token = header.slice("ClientToken ".length).trim();
      const { validateClientToken } = await import("../auth/clientTokens");
      const client = await validateClientToken(token);
      if (client) {
        return db.getCandidatesByClient(client.id);
      }
    }

    throw new TRPCError({ code: "UNAUTHORIZED", message: "Please login (10001)" });
  }),
  // ...
});
```

#### 3.4 CORS

Archivo: `integra-rh-manus/server/_core/index.ts`

```ts
const app = express();
app.use(
  cors({
    origin: 'https://integra-rh.web.app',
    methods: ['GET', 'POST', 'OPTIONS'],
    credentials: true,
  })
);
```

El error de CORS original (por `x-client-token`) ya no aparece; ahora el problema es 401.

### 4. Comportamiento actual

- CORS OK: preflight `OPTIONS` devuelve 204 correctamente.
- Flujo en incógnito con enlace `cliente?token=...`:
  - `clientAccess.validateToken` devuelve `valid: true` y `clientId`, se guarda el token en `sessionStorage`.
  - Al cargar `/cliente/dashboard`, las peticiones batched:
    - `GET /api/trpc/processes.list,candidates.list?batch=1&...`
  - responder 401 `UNAUTHORIZED` con mensaje `"Please login (10001)"`.

Ejemplo de log (`run.googleapis.com/requests`):

```json
{
  "requestMethod": "GET",
  "requestUrl": "https://api-559788019343.us-central1.run.app/api/trpc/processes.list,candidates.list?batch=1&input=...",
  "status": 401,
  "userAgent": "Chrome 142...",
  "referer": "https://integra-rh.web.app/",
  "severity": "WARNING"
}
```

En consola del navegador:

- Sin errores de CORS.
- tRPC lanza `TRPCClientError: Please login (10001)` en las queries del dashboard de cliente.

### 5. Objetivo

- Que un cliente, sin login Firebase y usando solo el token de enlace:
  - Acceda a `/cliente/dashboard`.
  - Vea sus procesos y candidatos (filtrados por `clienteId`).
  - Sin errores 401 ni redirecciones a login.

