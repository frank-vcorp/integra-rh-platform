-- ============================================================================
-- PARCHE DE PRODUCCIÓN - FIX-20260219-01
-- ============================================================================
-- ID: FIX-20260219-01
-- Fecha Ejecución: 2026-02-19 05:14 UTC
-- Ambiente: Producción (Railway - gondola.proxy.rlwy.net:18090/railway)
-- Autor: DEBY (Lead Debugger & Traceability Architect)
-- Ticket de Origen: IMPL-20250101-01 (Feature: Galerías de evidencia fotográfica)
--
-- CAUSA DEL PROBLEMA:
-- Commit 7cb23c0 agregó columna semanasDetalle a schema.ts y generó migración SQL,
-- pero Cloud Build nunca ejecutó 'npm run db:push', por lo que la columna no existe
-- en la tabla processes de producción.
--
-- SÍNTOMA:
-- HTTP 500 en endpoints processes.getById(74) y processes.list()
-- Error: "Column 'semanasDetalle' doesn't exist in field list"
--
-- SOLUCIÓN:
-- Agregar columna json con valor por defecto NULL a tabla processes
-- ============================================================================

USE railway;

-- Verificar estado previo (debe fallar antes del parche)
-- SELECT `semanasDetalle` FROM `processes` LIMIT 1;

-- ✓ PARCHE PRINCIPAL
ALTER TABLE `processes` 
ADD COLUMN `semanasDetalle` json DEFAULT NULL 
AFTER `visitStatus`,
ADD COMMENT 'Detalles estructurados de semanas cotizadas: { comentario?, evidenciasGraficas?[] } | FIX-20260219-01';

-- ✓ VERIFICACIÓN POST-PARCHE
-- DESCRIBE processes;
-- SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE 
-- FROM INFORMATION_SCHEMA.COLUMNS 
-- WHERE TABLE_NAME = 'processes' AND COLUMN_NAME = 'semanasDetalle';

-- Resultado esperado: json | YES | NULL

-- ============================================================================
-- SIGUIENTE PASO (PERMANENTE):
-- Agregar 'npm run db:push' a Dockerfile.prod para automatizar migraciones
-- Ver DICTAMEN_FIX-20260219-01.md sección B.2 para detalles de implementación
-- ============================================================================
