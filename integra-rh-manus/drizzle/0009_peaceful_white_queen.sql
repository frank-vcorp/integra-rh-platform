ALTER TABLE `processes` MODIFY COLUMN `calificacionFinal` enum('pendiente','recomendable','con_reservas','no_recomendable','recomendable_con_observacion','con_reservas_con_observacion') DEFAULT 'pendiente';--> statement-breakpoint
ALTER TABLE `candidates` ADD `dictamenLaboral` json;--> statement-breakpoint
ALTER TABLE `processes` ADD `semanasDetalle` json;--> statement-breakpoint
ALTER TABLE `processes` ADD `antecedentesPenales` json;