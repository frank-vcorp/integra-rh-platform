ALTER TABLE `processes` MODIFY COLUMN `estatusVisual` enum('nuevo','sin_entrevistar','entrevistado','en_proceso','pausado','cerrado','descartado') NOT NULL DEFAULT 'en_proceso';--> statement-breakpoint
ALTER TABLE `candidates` ADD `analistaAsignadoId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `clients` ADD `iaSuggestionsEnabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `processes` ADD `analistaAsignadoId` int;