CREATE TABLE `bapp_folders` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`storage_id` bigint unsigned NOT NULL,
	`number` int unsigned NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bapp_folders_id` PRIMARY KEY(`id`),
	CONSTRAINT `bapp_folders_storage_number_unique` UNIQUE(`storage_id`,`number`)
);
--> statement-breakpoint
ALTER TABLE `bapp_scans` ADD `folder_id` bigint unsigned;--> statement-breakpoint
ALTER TABLE `bapp_folders` ADD CONSTRAINT `bapp_folders_storage_id_bapp_storages_id_fk` FOREIGN KEY (`storage_id`) REFERENCES `bapp_storages`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bapp_scans` ADD CONSTRAINT `bapp_scans_folder_id_bapp_folders_id_fk` FOREIGN KEY (`folder_id`) REFERENCES `bapp_folders`(`id`) ON DELETE no action ON UPDATE no action;