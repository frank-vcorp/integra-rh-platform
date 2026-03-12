# CIERRE DE SESIÓN — 10 de Marzo 2026

**ID de Sesión:** IMPL-20260310-SESSION  
**Fecha:** 2026-03-10  
**Agentes Activos:** SOFIA (Builder), Deby (Forense)  
**Duración estimada:** ~8 horas (sesión maratónica)  
**Estado Final:** ✅ Todo desplegado y confirmado en producción  

---

## Resumen Ejecutivo

Sesión enfocada en resolver una cadena de bugs críticos relacionados con el componente `MapPicker` (Google Maps) y un error de infraestructura en el Dockerfile que rompía todos los endpoints de la API en producción.

---

## 🔧 Intervenciones Completadas

### 1. FIX-20260310-01/02 — API Key Google Maps (Dockerfile)
- **Problema:** `VITE_GOOGLE_MAPS_API_KEY` se sobreescribía con vacío en el paso de build
- **Solución:** Lógica condicional en `Dockerfile.prod` para solo inyectar si el ARG no está vacío
- **Archivos:** `Dockerfile.prod`
- **Commit:** (Primeros fixes del mapa)
- **Estado:** ✅ Resuelto

### 2. FIX-20260310-03 — Error `importLibrary is not a function`
- **Problema:** API moderna de Google Maps no disponible en el entorno de producción actual
- **Solución:** Revertir a constructores Legacy: `new google.maps.Map()`, `new google.maps.Marker()`, `new google.maps.Geocoder()`
- **Archivos:** `integra-rh-manus/client/src/components/MapPicker.tsx`
- **Estado:** ✅ Resuelto

### 3. FIX-20260310-04 — Crash `Node.removeChild`
- **Problema:** React intentaba eliminar nodos que Google Maps había tomado control, produciendo crash en desmontaje
- **Solución Arquitectónica:** Separar el contenedor del mapa de la jerarquía de React. El spinner de carga es un *sibling overlay*, no hijo del div del mapa
- **Archivos:** `integra-rh-manus/client/src/components/MapPicker.tsx`
- **Commit:** `93c419f`
- **Estado:** ✅ Resuelto — **Confirmado funcional por el usuario**

### 4. FIX-20260310-05 — 500 Error en API (`distPath` Docker)
- **Problema:** `GET /procesos` → 500. `vite.ts` calculaba `distPath=/dist/public/` usando `__dirname`, pero en el contenedor Docker los assets están en `/app/public/`
- **Causa Raíz:** Mismatch entre estructura de directorios en desarrollo vs producción Docker
- **Solución:** Rama condicional por `process.env.NODE_ENV`:
  - Producción: `/app/public` (path absoluto Docker)
  - Desarrollo: `path.resolve(__dirname, "../..", "dist", "public")` (relativo local)
- **Archivos:** `integra-rh-manus/server/_core/vite.ts`
- **Commit:** `492a5a2`
- **Estado:** ✅ Resuelto

---

## 📦 Estado del Deploy

| Componente | Estado | Método |
|-----------|--------|--------|
| Firebase Hosting (Frontend) | ✅ Live | Pipeline automático (Cloud Build) |
| Cloud Run (API) | ✅ Live | Pipeline automático (Cloud Build) |
| Cloud Functions | ✅ Live | Pipeline automático (Cloud Build) |

**Último build exitoso:** `5e99bea6` — terminado ~04:09 UTC

---

## 📂 Archivos Modificados en Sesión

| Archivo | Tipo | Fix Asociado |
|---------|------|-------------|
| `integra-rh-manus/client/src/components/MapPicker.tsx` | Feature Fix | FIX-20260310-03/04 |
| `Dockerfile.prod` | Infrastructure Fix | FIX-20260310-01/02 |
| `integra-rh-manus/server/_core/vite.ts` | Infrastructure Fix | FIX-20260310-05 |
| `PROYECTO.md` | Documentación | Actualizado estado |

---

## 🗂️ Interconsultas Generadas

- `context/interconsultas/DICTAMEN_FIX-20260310-05.md` — Diagnóstico forense Deby sobre distPath

---

## 🚩 Pendientes / Backlog (No bloqueantes)

Según `PROYECTO.md`, las siguientes tareas siguen en cola para próximas sesiones:

| ID | Tarea | Prioridad |
|----|-------|-----------|
| PVM-OBS-02 | Healthcheck y métricas básicas | Media |
| PVM-SEC-01 | RBAC base (admin/cliente) | Media |
| PVM-REL-01 | Deploy stg (API + Web) | Media |
| SYNC-SS-03 | % Completitud en CandidatoDetalle | Baja |

---

## 💡 Lecciones Aprendidas

1. **Docker + `__dirname`**: Cuando Node compila a un bundle `/app/dist/index.js`, `__dirname` pasa a ser `/app/dist`, rompiendo rutas relativas. Siempre usar rutas absolutas o `NODE_ENV` para paths de assets en producción.
2. **Google Maps Legacy API**: Para proyectos existentes con API Keys restrictivas, preferir constructores legacy sobre `importLibrary` hasta confirmar compatibilidad.
3. **React + Google Maps DOM**: Nunca anidar componentes de React como hijos del `div` que Google Maps controla. Usar siblings/overlay para loaders y controles visuales.

---

## ✅ Gates de Cierre

- [✓] **Gate 1 — Compilación**: Build Cloud Build exitoso
- [✓] **Gate 2 — Testing**: API responde 401 (auth) en lugar de 500 (error)
- [✓] **Gate 3 — Revisión**: Usuario confirmó "ya funciona el mapa"
- [✓] **Gate 4 — Documentación**: Dictamen + Checkpoint generados

---

*Sesión cerrada. Próximo agente puede retomar desde backlog PROYECTO.md.*
