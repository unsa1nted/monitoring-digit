CREATE TABLE `bapp_reviewer_assignments` (
	`npsn` varchar(20) NOT NULL,
	`user_petugas` varchar(80) NOT NULL,
	CONSTRAINT `bapp_reviewer_assignments_npsn` PRIMARY KEY(`npsn`)
);
--> statement-breakpoint
ALTER TABLE `petugas_reviewer` ADD CONSTRAINT `petugas_reviewer_user_petugas_unique` UNIQUE(`user_petugas`);--> statement-breakpoint
ALTER TABLE `bapp_reviewer_assignments` ADD CONSTRAINT `bapp_reviewer_petugas_fk` FOREIGN KEY (`user_petugas`) REFERENCES `petugas_reviewer`(`user_petugas`) ON DELETE no action ON UPDATE no action;
