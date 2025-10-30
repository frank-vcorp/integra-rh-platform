CREATE TABLE `candidateComments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`candidatoId` int NOT NULL,
	`text` text NOT NULL,
	`author` varchar(255) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `candidateComments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `candidates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nombreCompleto` varchar(255) NOT NULL,
	`email` varchar(320),
	`telefono` varchar(50),
	`medioDeRecepcion` varchar(100),
	`clienteId` int,
	`puestoId` int,
	`psicometricos` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `candidates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nombreEmpresa` varchar(255) NOT NULL,
	`ubicacionPlaza` varchar(255),
	`reclutador` varchar(255),
	`contacto` varchar(255),
	`telefono` varchar(50),
	`email` varchar(320),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`candidatoId` int,
	`procesoId` int,
	`tipoDocumento` varchar(100) NOT NULL,
	`nombreArchivo` varchar(255) NOT NULL,
	`url` varchar(500) NOT NULL,
	`fileKey` varchar(500) NOT NULL,
	`mimeType` varchar(100),
	`tamanio` int,
	`uploadedBy` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`procesoId` int NOT NULL,
	`encuestadorId` int NOT NULL,
	`monto` int NOT NULL,
	`fechaPago` timestamp,
	`estatusPago` enum('pendiente','pagado') NOT NULL DEFAULT 'pendiente',
	`metodoPago` varchar(100),
	`observaciones` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `payments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nombreDelPuesto` varchar(255) NOT NULL,
	`clienteId` int NOT NULL,
	`descripcion` text,
	`estatus` enum('activo','cerrado','pausado') NOT NULL DEFAULT 'activo',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `processComments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`procesoId` int NOT NULL,
	`text` text NOT NULL,
	`author` varchar(255) NOT NULL,
	`processStatusAtTime` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `processComments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `processes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`candidatoId` int NOT NULL,
	`clienteId` int NOT NULL,
	`puestoId` int NOT NULL,
	`clave` varchar(50) NOT NULL,
	`tipoProducto` enum('ILA','ESE') NOT NULL,
	`consecutivo` int NOT NULL,
	`fechaRecepcion` timestamp NOT NULL,
	`fechaEnvio` timestamp,
	`quienEnvio` varchar(255),
	`estatusProceso` enum('en_recepcion','asignado','en_verificacion','visita_programada','visita_realizada','en_dictamen','finalizado','entregado') NOT NULL DEFAULT 'en_recepcion',
	`calificacionFinal` enum('pendiente','recomendable','con_reservas','no_recomendable') DEFAULT 'pendiente',
	`archivoDictamenUrl` varchar(500),
	`archivoDictamenPath` varchar(500),
	`shareableId` varchar(100),
	`arrivalDateTime` timestamp,
	`visitStatus` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `processes_id` PRIMARY KEY(`id`),
	CONSTRAINT `processes_clave_unique` UNIQUE(`clave`)
);
--> statement-breakpoint
CREATE TABLE `surveyors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nombre` varchar(255) NOT NULL,
	`telefono` varchar(50),
	`email` varchar(320),
	`activo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `surveyors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`candidatoId` int NOT NULL,
	`empresa` varchar(255) NOT NULL,
	`puesto` varchar(255),
	`fechaInicio` varchar(50),
	`fechaFin` varchar(50),
	`tiempoTrabajado` varchar(100),
	`contactoReferencia` varchar(255),
	`telefonoReferencia` varchar(50),
	`correoReferencia` varchar(320),
	`resultadoVerificacion` enum('pendiente','recomendable','con_reservas','no_recomendable') DEFAULT 'pendiente',
	`observaciones` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','client') NOT NULL DEFAULT 'admin';--> statement-breakpoint
ALTER TABLE `users` ADD `clientId` int;