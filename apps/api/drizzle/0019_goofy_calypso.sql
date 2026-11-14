CREATE TABLE `bapp_review_notifications` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`id_transaksi` varchar(80) NOT NULL,
	`user_petugas` varchar(80) NOT NULL,
	`nama_sekolah` varchar(255),
	`npsn` varchar(20) NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`read_at` timestamp,
	CONSTRAINT `bapp_review_notifications_id` PRIMARY KEY(`id`),
	CONSTRAINT `bapp_review_notifications_id_transaksi_unique` UNIQUE(`id_transaksi`)
);
--> statement-breakpoint
CREATE INDEX `bapp_review_notifications_reviewer_unread` ON `bapp_review_notifications` (`user_petugas`,`read_at`);