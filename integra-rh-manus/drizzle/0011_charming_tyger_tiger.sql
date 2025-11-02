CREATE TABLE `surveyorMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`encuestadorId` int NOT NULL,
	`procesoId` int,
	`canal` enum('whatsapp','email','sms','otro') NOT NULL DEFAULT 'whatsapp',
	`contenido` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `surveyorMessages_id` PRIMARY KEY(`id`)
);
