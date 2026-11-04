CREATE TABLE `bapp_school_counts` (
	`npsn` varchar(20) NOT NULL,
	`status` enum('pending','checking','ready','error') NOT NULL DEFAULT 'pending',
	`transaction_ids` json,
	`checked_at` timestamp,
	`claimed_at` timestamp,
	`message` varchar(255),
	CONSTRAINT `bapp_school_counts_npsn` PRIMARY KEY(`npsn`)
);
--> statement-breakpoint
CREATE INDEX `bapp_scans_npsn_idx` ON `bapp_scans` (`npsn`,`validation_status`);