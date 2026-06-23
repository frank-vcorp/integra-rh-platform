-- =============================================================================
-- diag-storage-keys.sql
-- Detecta fileKey con doble encoding (%2525xx) o caracteres problemáticos en la
-- tabla `documents`. NO modifica ni borra nada; solo lista.
--
-- @intervention IMPL-ARCH-20260622-01
-- @respaldo context/SPECs/SPEC-ARCH-20260622-01-fix-storage-upload-no-such-key.md (sección 3.4)
--
-- Uso: psql -U <usuario> -d <db> -f scripts/diag-storage-keys.sql
--      o pegar en el cliente SQL preferido (pgAdmin, DBeaver, etc.)
-- =============================================================================

SELECT
  id,
  proceso_id,
  candidato_id,
  tipo_documento,
  nombre_archivo,
  file_key,
  url,
  created_at,
  CASE
    WHEN file_key LIKE '%2525%' THEN 'DOBLE_ENCODING'
    WHEN file_key ~ '[\\?#\[\]*/\\:|;]' THEN 'CARACTER_INVALIDO'
    WHEN file_key ~ '\s' THEN 'ESPACIO_LITERAL'
    ELSE 'OK'
  END AS estado
FROM documents
WHERE file_key IS NOT NULL
ORDER BY
  CASE
    WHEN file_key LIKE '%2525%' THEN 0
    WHEN file_key ~ '[\\?#\[\]*/\\:|;]' THEN 1
    WHEN file_key ~ '\s' THEN 2
    ELSE 3
  END,
  created_at DESC
LIMIT 200;