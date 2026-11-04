CREATE TABLE `activity_logs` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`username` varchar(80) NOT NULL,
	`role` enum('Admin','Dinas') NOT NULL,
	`action` varchar(80) NOT NULL,
	`method` varchar(10) NOT NULL,
	`path` varchar(255) NOT NULL,
	`detail` text,
	`ip_address` varchar(64),
	`user_agent` varchar(512),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_logs_id` PRIMARY KEY(`id`)
);
