CREATE TABLE `clientSites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`nombrePlaza` varchar(255) NOT NULL,
	`ciudad` varchar(255),
	`estado` varchar(255),
	`activo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clientSites_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `candidates` ADD `clientSiteId` int;--> statement-breakpoint
ALTER TABLE `processes` ADD `clientSiteId` int;