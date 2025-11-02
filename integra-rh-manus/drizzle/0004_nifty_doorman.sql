CREATE TABLE `clientAccessTokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(64) NOT NULL,
	`clientId` int NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`lastUsedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `clientAccessTokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `clientAccessTokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
ALTER TABLE `clientAccessTokens` ADD CONSTRAINT `clientAccessTokens_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;