CREATE TABLE `bapp_hisense_sync_runs` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`source` enum('automatic','manual') NOT NULL,
	`synced_at` timestamp NOT NULL DEFAULT (now()),
	`created` int NOT NULL,
	`updated` int NOT NULL,
	`allocated` int NOT NULL,
	`distribution` json NOT NULL,
	CONSTRAINT `bapp_hisense_sync_runs_id` PRIMARY KEY(`id`)
);
