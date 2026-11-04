CREATE TABLE `bapp_storages` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`type` enum('Dus','Kontainer','Penyimpanan Lainnya') NOT NULL,
	`created_by` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bapp_storages_id` PRIMARY KEY(`id`),
	CONSTRAINT `bapp_storages_name_unique` UNIQUE(`name`)
);
