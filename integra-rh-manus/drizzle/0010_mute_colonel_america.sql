ALTER TABLE `surveyors` ADD `cobertura` enum('local','foraneo','ambos') DEFAULT 'local' NOT NULL;--> statement-breakpoint
ALTER TABLE `surveyors` ADD `ciudadBase` varchar(255);--> statement-breakpoint
ALTER TABLE `surveyors` ADD `estadosCobertura` json;--> statement-breakpoint
ALTER TABLE `surveyors` ADD `radioKm` int;--> statement-breakpoint
ALTER TABLE `surveyors` ADD `vehiculo` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `surveyors` ADD `tarifaLocal` int;--> statement-breakpoint
ALTER TABLE `surveyors` ADD `tarifaForanea` int;--> statement-breakpoint
ALTER TABLE `surveyors` ADD `notas` text;