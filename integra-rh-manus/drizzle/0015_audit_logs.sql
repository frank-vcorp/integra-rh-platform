CREATE TABLE `audit_logs` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `userId` int NULL,
  `actorType` enum('admin','client','system') NOT NULL DEFAULT 'system',
  `action` varchar(100) NOT NULL,
  `entityType` varchar(100) NOT NULL,
  `entityId` varchar(100) NULL,
  `requestId` varchar(64) NULL,
  `details` json NULL
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

