CREATE TABLE `bapp_scans` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`storage_id` bigint unsigned NOT NULL,
	`request_id` varchar(36) NOT NULL,
	`barcode` varchar(160) NOT NULL,
	`scanned_by` int NOT NULL,
	`validation_status` enum('pending','checking','valid','invalid','error') NOT NULL DEFAULT 'pending',
	`validation_message` varchar(255),
	`school_name` varchar(255),
	`npsn` varchar(20),
	`checked_at` timestamp,
	`claimed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bapp_scans_id` PRIMARY KEY(`id`),
	CONSTRAINT `bapp_scans_request_id_unique` UNIQUE(`request_id`)
);
--> statement-breakpoint
ALTER TABLE `bapp_scans` ADD CONSTRAINT `bapp_scans_storage_id_bapp_storages_id_fk` FOREIGN KEY (`storage_id`) REFERENCES `bapp_storages`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `bapp_scans_storage_idx` ON `bapp_scans` (`storage_id`,`id`);--> statement-breakpoint
CREATE INDEX `bapp_scans_barcode_idx` ON `bapp_scans` (`barcode`);--> statement-breakpoint
CREATE INDEX `bapp_scans_status_idx` ON `bapp_scans` (`validation_status`);