CREATE TABLE `processReportVersions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`procesoId` int NOT NULL,
	`versionNumber` int NOT NULL,
	`status` enum('draft','published','archived') NOT NULL DEFAULT 'draft',
	`reportScope` enum('armado_manual','legacy_visit_pdf') NOT NULL DEFAULT 'armado_manual',
	`sections` json NOT NULL,
	`snapshot` json,
	`pdfFileName` varchar(255),
	`pdfStoragePath` varchar(500),
	`createdByUserId` int,
	`createdByName` varchar(255),
	`publishedByUserId` int,
	`publishedByName` varchar(255),
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `processReportVersions_id` PRIMARY KEY(`id`)
);
