**ID:** `PVM-DEV-01`
**Título:** `Scripts y .env`

**Resumen:**
Estandarizar variables de entorno y scripts de desarrollo para ejecutar API, migraciones y ETL de forma consistente en dev/stg.

**Criterios de Aceptación (DoD):**
1. Documentar `.env` requerido: `DATABASE_URL`, `GOOGLE_APPLICATION_CREDENTIALS`, `PORT`, `VITE_API_BASE`, `VITE_FIREBASE_*`.
2. Scripts en `package.json`: `dev`, `db:push`, `data:export`, `data:import`, `data:verify` (ya presentes), y `start` para prod.
3. `dotenv` cargado en servidor/CLI (`dotenv/config`).
4. README breve con pasos de arranque: migrar DB, levantar API, correr ETL, levantar web.
5. Validación: levantar en dev y ejecutar healthcheck con éxito.

**Fuera de Alcance:** CI completa; manejo de secretos en vault; plantillas de docker.

