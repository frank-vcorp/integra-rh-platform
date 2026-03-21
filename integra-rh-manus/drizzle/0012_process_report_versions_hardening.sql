UPDATE `processReportVersions`
SET `snapshot` = JSON_OBJECT()
WHERE `snapshot` IS NULL;

ALTER TABLE `processReportVersions`
MODIFY COLUMN `snapshot` json NOT NULL;

ALTER TABLE `processReportVersions`
ADD CONSTRAINT `process_report_versions_proceso_version_unique`
UNIQUE (`procesoId`, `versionNumber`);
