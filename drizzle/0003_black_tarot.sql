CREATE TABLE `reminderSettings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`channel` enum('email','whatsapp') NOT NULL DEFAULT 'email',
	`recipient` varchar(320) NOT NULL,
	`hoursBefore` int NOT NULL DEFAULT 24,
	`enabled` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reminderSettings_id` PRIMARY KEY(`id`),
	CONSTRAINT `reminderSettings_owner_unique` UNIQUE(`ownerId`)
);
