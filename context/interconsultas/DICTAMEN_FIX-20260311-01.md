# DICTAMEN TÉCNICO: Proxy Vite Faltante Provoca html 404 en API /api/trpc
- **ID:** FIX-20260311-01
- **Fecha:** 2026-03-11
- **Solicitante:** Humano (Reporte de Usuario Local)
- **Estado:** ✅ VALIDADO

### A. Análisis de Causa Raíz
Síntoma: El cliente reporta que el inicio de sesión falla en local arrojando el error `TRPCClientError: Unexpected token '<', "<!doctype "... is not valid JSON`.
Hallazgo forense: Se verificó la inicialización de tRPC en `client/src/main.tsx`. En entorno local de desarrollo `getApiUrl()` resuelve a `/api/trpc`. Sin embargo, `vite.config.ts` no tenía ningún proxy configurado para interceptar `/api` ni enrutarlo hacia el servidor de backend (puerto 3000). Al no haber ruta interceptada, Vite servía el `index.html` (fallback 404 para SPA) como respuesta.
Causa: Corrupción, sobrescritura o eliminación accidental anterior del bloque `proxy` dentro de la directiva `server` en `vite.config.ts`.

### B. Justificación de la Solución
Se agregó el bloque `proxy` en la configuración del dev server de Vite (`vite.config.ts`) para redirigir todas las peticiones con prefijo `/api` hacia `http://localhost:3000`. Esto restablece el canal de comunicación entre el frontend dev (puerto 5173 por defecto) y el dev server de API, permitiendo a tRPC recibir peticiones JSON en lugar de HTML de fallback.

### C. Instrucciones de Handoff para Usuario/Desarrollador
1. Reiniciar el servidor Vite usando la terminal donde antes corría `npm run dev`.
2. Verificar que el error desaparece al intentar el login (asegurarse de que el servidor en el puerto 3000 esté arriba).