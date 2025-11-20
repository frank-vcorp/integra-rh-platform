ALTER TABLE `processes`
  ADD COLUMN `especialistaAtraccionId` int NULL,
  ADD COLUMN `especialistaAtraccionNombre` varchar(255),
  ADD COLUMN `estatusVisual` enum('nuevo','en_proceso','pausado','cerrado','descartado') NOT NULL DEFAULT 'en_proceso',
  ADD COLUMN `fechaCierre` timestamp NULL,
  ADD COLUMN `investigacionLaboral` json,
  ADD COLUMN `investigacionLegal` json,
  ADD COLUMN `buroCredito` json,
  ADD COLUMN `visitaDetalle` json;
