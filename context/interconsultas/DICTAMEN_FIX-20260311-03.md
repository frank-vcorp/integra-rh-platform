# DICTAMEN TÉCNICO: Resolución de fallback a index.html en tRPC (Local)
- **ID:** FIX-20260311-03
- **Fecha:** 2026-03-11
- **Solicitante:** HUMANO (vía Prompt)
- **Estado:** ✅ VALIDADO

### A. Análisis de Causa Raíz
**Síntoma:** 
Al intentar entrar al portal en entorno local (`npm run dev`), el cliente arroja el error `TRPCClientError: Unexpected token '<', "<!doctype "... is not valid JSON`.

**Hallazgo Forense:** 
Al ejecutar `npm run dev`, se utilizan dos servidores en paralelo (definidos en `package.json`): un servidor en modo watch para el backend de Express (puerto `3000` o `PORT` inyectado, como los de `railway`) y un servidor de Vite independiente (puerto `5173`).
El servidor de Vite en el puerto `5173` es donde generalmente el entorno de desarrollo loguea el acceso (`http://localhost:5173/`).
Al revisar `vite.config.ts`, se comprobó que **las reglas de redirección o proxy hacia el backend no existían**. Como resultado, cuando el frontend consumía rutas que inician con `/api/trpc/...`, Vite dev server asumía que eran rutas SPA del frontend, retornando el fallback de `index.html` (comenzando con `<!doctype html>...`).

**Causa:**
Pérdida u omisión de las directivas `server.proxy` de Vite en el archivo `vite.config.ts`. Esto impedía que las llamadas locales de `vite` al endpoint `/api/*` llegaran al backend de Express, cortando la comunicación de la API en el puerto `5173`.

### B. Justificación de la Solución
**Qué se hizo y por qué:**
Toda ruta de API (incluyendo `/api` y webhooks como `/test-webhook`) necesita ser canalizada al backend en desarrollo local sin evadir CORS ni provocar fallbacks SPA.
Se inyectó en `vite.config.ts` un objeto `proxy` en la configuración `server`:
```typescript
    proxy: {
      "/api": {
        target: `http://localhost:${process.env.PORT || "3000"}`,
        changeOrigin: true,
        secure: false,
      },
      "/test-webhook": {
        // ...
      }
    }
```
Se utilizó una plantilla dinámica con `process.env.PORT || "3000"` para el target de forma que **sea compatible con Railway CLI** cuando el usuario encapsula su ejecución (Railway asigna sus propios puertos dinámicos para los componentes y usa variables de entorno para ello). 
Esto estabiliza el comportamiento: El servidor de Vite en `5173` redirigirá el tráfico transparente y exitosamente a Express, restaurando las respuestas en formato `application/json` puro sin fallbacks de HTML.

### C. Instrucciones de Handoff para HUMANO/CRONISTA
1. El usuario ahora puede acceder a `http://localhost:5173` o al puerto que le asigne railway con `npm run dev` local y probar que las llamadas tRPC ya no se rompen por el _Unexpected token HTML_.
2. Documentar que la configuración de Vite depende ahora de `process.env.PORT` por motivos de hibridación con _Railway CLI_.