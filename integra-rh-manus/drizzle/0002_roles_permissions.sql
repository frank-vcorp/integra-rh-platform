CREATE TABLE `roles` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `name` varchar(100) NOT NULL,
  `description` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `roles_name_unique` (`name`)
);
--> statement-breakpoint
CREATE TABLE `role_permissions` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `roleId` int NOT NULL,
  `module` varchar(100) NOT NULL,
  `action` enum('view','create','edit','delete') NOT NULL,
  `allowed` boolean NOT NULL DEFAULT 1,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `role_permissions_roleId_roles_id_fk`
    FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE CASCADE
);
--> statement-breakpoint
CREATE TABLE `user_roles` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `roleId` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `user_roles_userId_users_id_fk`
    FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `user_roles_roleId_roles_id_fk`
    FOREIGN KEY (`roleId`) REFERENCES `roles`(`id`) ON DELETE CASCADE
);

