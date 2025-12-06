ALTER TABLE `workHistory` ADD COLUMN IF NOT EXISTS `investigacionDetalle` json;--> statement-breakpoint
ALTER TABLE `workHistory` ADD COLUMN IF NOT EXISTS `desempenoScore` int;
