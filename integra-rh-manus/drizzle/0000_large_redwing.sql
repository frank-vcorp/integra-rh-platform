CREATE TABLE `audit_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`userId` int,
	`actorType` enum('admin','client','system') NOT NULL DEFAULT 'system',
	`action` varchar(100) NOT NULL,
	`entityType` varchar(100) NOT NULL,
	`entityId` varchar(100),
	`requestId` varchar(64),
	`details` json,
	CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `candidateComments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`candidatoId` int NOT NULL,
	`text` text NOT NULL,
	`author` varchar(255) NOT NULL,
	`visibility` enum('public','internal') NOT NULL DEFAULT 'internal',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `candidateComments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `candidate_consents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`candidatoId` int NOT NULL,
	`token` varchar(64) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`is_given` boolean NOT NULL DEFAULT false,
	`givenAt` timestamp,
	`ip_address` varchar(45),
	`user_agent` varchar(255),
	`signature_storage_path` varchar(512),
	`privacy_policy_version` varchar(50),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `candidate_consents_id` PRIMARY KEY(`id`),
	CONSTRAINT `candidate_consents_token_unique` UNIQUE(`token`)
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
CREATE TABLE `clientAccessTokens` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(64) NOT NULL,
	`clientId` int NOT NULL,
	`procesoId` int,
	`candidatoId` int,
	`expiresAt` timestamp NOT NULL,
	`lastUsedAt` timestamp,
	`revokedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `clientAccessTokens_id` PRIMARY KEY(`id`),
	CONSTRAINT `clientAccessTokens_token_unique` UNIQUE(`token`)
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
	`url` text NOT NULL,
	`fileKey` text NOT NULL,
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
	`especialistaAtraccionId` int,
	`especialistaAtraccionNombre` varchar(255),
	`clave` varchar(50) NOT NULL,
	`tipoProducto` enum('ILA','ESE LOCAL','ESE FORANEO','VISITA LOCAL','VISITA FORANEA','ILA CON BURÓ DE CRÉDITO','ESE LOCAL CON BURÓ DE CRÉDITO','ESE FORANEO CON BURÓ DE CRÉDITO','ILA CON INVESTIGACIÓN LEGAL','ESE LOCAL CON INVESTIGACIÓN LEGAL','ESE FORANEO CON INVESTIGACIÓN LEGAL','BURÓ DE CRÉDITO','INVESTIGACIÓN LEGAL','SEMANAS COTIZADAS') NOT NULL,
	`consecutivo` int NOT NULL,
	`fechaRecepcion` timestamp NOT NULL,
	`fechaCierre` timestamp,
	`fechaEnvio` timestamp,
	`quienEnvio` varchar(255),
	`medioDeRecepcion` enum('whatsapp','correo','telefono','boca_a_boca','portal','presencial','otro'),
	`estatusProceso` enum('en_recepcion','asignado','en_verificacion','visita_programada','visita_realizada','en_dictamen','finalizado','entregado') NOT NULL DEFAULT 'en_recepcion',
	`calificacionFinal` enum('pendiente','recomendable','con_reservas','no_recomendable') DEFAULT 'pendiente',
	`estatusVisual` enum('nuevo','en_proceso','pausado','cerrado','descartado') NOT NULL DEFAULT 'en_proceso',
	`investigacionLaboral` json,
	`investigacionLegal` json,
	`buroCredito` json,
	`visitaDetalle` json,
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
CREATE TABLE `surveyorMessages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`encuestadorId` int NOT NULL,
	`procesoId` int,
	`canal` enum('whatsapp','email','sms','otro') NOT NULL DEFAULT 'whatsapp',
	`contenido` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `surveyorMessages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `surveyors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nombre` varchar(255) NOT NULL,
	`telefono` varchar(50),
	`email` varchar(320),
	`cobertura` enum('local','foraneo','ambos') NOT NULL DEFAULT 'local',
	`ciudadBase` varchar(255),
	`estadosCobertura` json,
	`radioKm` int,
	`vehiculo` boolean NOT NULL DEFAULT false,
	`tarifaLocal` int,
	`tarifaForanea` int,
	`notas` text,
	`activo` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `surveyors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`whatsapp` varchar(50),
	`loginMethod` varchar(64),
	`role` enum('admin','client') NOT NULL DEFAULT 'admin',
	`clientId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
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
	`causalSalidaRH` enum('RENUNCIA VOLUNTARIA','TÉRMINO DE CONTRATO','CIERRE DE LA EMPRESA','JUVILACIÓN','ABANDONO DE TRABAJO','ACUMULACIÓN DE FALTAS','BAJO DESEMPEÑO','FALTA DE PROBIDAD','VIOLACIÓN AL CÓDIGO DE CONDUCTA','ABUSO DE CONFIANZA','INCUMPLIMIENTO A POLÍTICAS Y PROCESOS'),
	`causalSalidaJefeInmediato` enum('RENUNCIA VOLUNTARIA','TÉRMINO DE CONTRATO','CIERRE DE LA EMPRESA','JUVILACIÓN','ABANDONO DE TRABAJO','ACUMULACIÓN DE FALTAS','BAJO DESEMPEÑO','FALTA DE PROBIDAD','VIOLACIÓN AL CÓDIGO DE CONDUCTA','ABUSO DE CONFIANZA','INCUMPLIMIENTO A POLÍTICAS Y PROCESOS'),
	`contactoReferencia` varchar(255),
	`telefonoReferencia` varchar(50),
	`correoReferencia` varchar(320),
	`resultadoVerificacion` enum('pendiente','recomendable','con_reservas','no_recomendable') DEFAULT 'pendiente',
	`estatusInvestigacion` enum('en_revision','revisado','terminado') NOT NULL DEFAULT 'en_revision',
	`comentarioInvestigacion` text,
	`observaciones` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `candidate_consents` ADD CONSTRAINT `candidate_consents_candidatoId_candidates_id_fk` FOREIGN KEY (`candidatoId`) REFERENCES `candidates`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `clientAccessTokens` ADD CONSTRAINT `clientAccessTokens_clientId_clients_id_fk` FOREIGN KEY (`clientId`) REFERENCES `clients`(`id`) ON DELETE cascade ON UPDATE no action;