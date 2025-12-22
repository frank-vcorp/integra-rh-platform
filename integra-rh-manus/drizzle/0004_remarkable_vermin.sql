CREATE TABLE `candidateSelfTokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`candidateId` int NOT NULL,
	`token` varchar(64) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`usedAt` timestamp,
	`revoked` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `candidateSelfTokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `candidateSelfTokens_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
ALTER TABLE `audit_logs` MODIFY COLUMN `actorType` enum('admin','client','system','candidate') NOT NULL DEFAULT 'system';--> statement-breakpoint
ALTER TABLE `candidates` ADD `selfFilledStatus` enum('pendiente','recibido','revisado') DEFAULT 'pendiente';--> statement-breakpoint
ALTER TABLE `candidates` ADD `selfFilledAt` timestamp;--> statement-breakpoint
ALTER TABLE `candidates` ADD `selfFilledReviewedBy` int;--> statement-breakpoint
ALTER TABLE `candidates` ADD `selfFilledReviewedAt` timestamp;--> statement-breakpoint
ALTER TABLE `workHistory` ADD `capturadoPor` enum('candidato','analista') DEFAULT 'analista' NOT NULL;--> statement-breakpoint
ALTER TABLE `candidateSelfTokens` ADD CONSTRAINT `candidateSelfTokens_candidateId_candidates_id_fk` FOREIGN KEY (`candidateId`) REFERENCES `candidates`(`id`) ON DELETE cascade ON UPDATE no action;