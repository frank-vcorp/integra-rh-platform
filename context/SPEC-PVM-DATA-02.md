**ID:** `PVM-DATA-02`
**Título:** `ETL a MySQL/TiDB (clients/posts)`

**Resumen:**
Importar a la base de datos los datos exportados desde Firestore (JSON) para las entidades `clients` y `posts` usando Drizzle. Mantener un mapeo consistente de IDs fuente→destino y registrar omisiones por FKs inválidas.

**Criterios de Aceptación (DoD):**
1. Script `integra-rh-manus/scripts/etl-import.ts` lee `integra-rh-manus/data/exports/*.json`.
2. Inserta `clients` y genera mapa `fsId→sqlId` persistente en memoria de proceso (y opcionalmente a disco `data/exports/id-map.json`).
3. Inserta `posts` usando el mapa; omite entradas sin cliente mapeado y las registra (conteo y lista de IDs omitidos).
4. Soporta `--dry-run` (no escribe en DB) y flag `--truncate` para cargas limpias en entornos dev/stg.
5. Usa Drizzle y `DATABASE_URL` (sin credenciales en código). Errores fallan el proceso con código ≠ 0.
6. Logs estructurados: totales leídos/insertados/omitidos por entidad y duración total.

**Fuera de Alcance:** Normalización avanzada de datos y entidades no listadas; reintentos con backoff; paralelismo.

