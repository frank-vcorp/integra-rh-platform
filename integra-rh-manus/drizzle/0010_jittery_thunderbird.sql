CREATE TABLE `surveyorTokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(128) NOT NULL,
	`processId` int NOT NULL,
	`surveyorId` int,
	`status` enum('PENDIENTE','EN_CURSO','COMPLETADO') NOT NULL DEFAULT 'PENDIENTE',
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `surveyorTokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `surveyorTokens_token_unique` UNIQUE(`token`)
);
