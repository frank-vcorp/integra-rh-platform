-- IMPL-20260408-01: Agrega htmlStoragePath a processReportVersions
-- Permite persistir la ruta del HTML generado por armadoHtmlRenderer.
-- Hotfix mínimo para habilitar preview HTML en Armados v2.
ALTER TABLE `processReportVersions`
  ADD COLUMN `htmlStoragePath` VARCHAR(500) NULL AFTER `pdfStoragePath`;
