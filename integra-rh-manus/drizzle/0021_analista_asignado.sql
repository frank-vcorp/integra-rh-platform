-- Agregar columna analistaAsignadoId a tabla candidates
-- FK a users.id para rastrear analista responsable del candidato
ALTER TABLE `candidates`
ADD COLUMN `analistaAsignadoId` int NOT NULL AFTER `selfFilledReviewedAt`,
ADD INDEX `idx_candidates_analistaAsignadoId` (`analistaAsignadoId`),
ADD CONSTRAINT `fk_candidates_analistaAsignadoId` 
  FOREIGN KEY (`analistaAsignadoId`) 
  REFERENCES `users` (`id`) 
  ON DELETE RESTRICT 
  ON UPDATE CASCADE;

-- Agregar columna analistaAsignadoId a tabla processes
-- Hereda del candidato pero puede ser modificado
ALTER TABLE `processes`
ADD COLUMN `analistaAsignadoId` int AFTER `especialistaAtraccionNombre`,
ADD INDEX `idx_processes_analistaAsignadoId` (`analistaAsignadoId`),
ADD CONSTRAINT `fk_processes_analistaAsignadoId` 
  FOREIGN KEY (`analistaAsignadoId`) 
  REFERENCES `users` (`id`) 
  ON DELETE SET NULL 
  ON UPDATE CASCADE;
