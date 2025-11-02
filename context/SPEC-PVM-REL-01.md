**ID:** `PVM-REL-01`
**Título:** `Deploy Staging (API + Web)`

**Resumen:**
Desplegar un entorno de staging funcional para la API y el frontend, con variables de entorno seguras y healthcheck operativo.

**Criterios de Aceptación (DoD):**
1. API desplegada (Node 18+) con variables `DATABASE_URL` y `GOOGLE_APPLICATION_CREDENTIALS` configuradas. Healthcheck responde 200.
2. Base de datos staging provisionada y migrada (`db:push`).
3. Frontend build (`vite build`) y servido (CDN u host estático). Apunta a `VITE_API_BASE` del staging.
4. Probar login y consumo de `auth.me`, `clients.list`.
5. Documentar procedimiento de despliegue y rollback básico.

**Fuera de Alcance:** IaC completo; autoescalado; pipelines CI/CD avanzados.

