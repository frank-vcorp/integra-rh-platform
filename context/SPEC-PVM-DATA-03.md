**ID:** `PVM-DATA-03`
**Título:** `Verificación de Conteos y FKs (clients/posts)`

**Resumen:**
Validar que los conteos de registros importados desde los JSON coincidan con los almacenados en MySQL/TiDB, y comprobar integridad referencial básica (FKs) entre `posts.clienteId` y `clients.id`.

**Criterios de Aceptación (DoD):**
1. Script `integra-rh-manus/scripts/etl-verify.ts` compara conteos fuente (JSON) vs destino (DB) para `clients` y `posts`.
2. Verifica que todo `posts.clienteId` exista en `clients.id`. Reporta huérfanos (conteo y ejemplos de IDs).
3. Salida de verificación con estatus global: `ok: true/false`, y sección por entidad con: `sourceCount`, `dbCount`, `match`, `fkOrphans` (si aplica).
4. Código de salida: `0` si todo consistente; `1` si hay discrepancias/críticos.
5. Usa `DATABASE_URL` y lee los mismos JSON de `data/exports/`.

**Fuera de Alcance:** Verificación de entidades no listadas; validaciones de negocio avanzadas; checks de unicidad complejos.

