CREATE TABLE `services` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`name` varchar(120) NOT NULL,
	`url` varchar(255) NOT NULL,
	`status` enum('operational','degraded','down') NOT NULL DEFAULT 'operational',
	`uptime` int NOT NULL DEFAULT 10000,
	`latency` int NOT NULL DEFAULT 0,
	`last_checked_at` timestamp NOT NULL DEFAULT (now()),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `services_id` PRIMARY KEY(`id`)
);
