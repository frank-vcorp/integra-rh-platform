ALTER TABLE `users` ADD `password` varchar(255);--> statement-breakpoint
ALTER TABLE `users` ADD `mustChangePassword` enum('yes','no') DEFAULT 'no';