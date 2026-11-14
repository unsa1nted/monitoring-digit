CREATE TABLE `petugas_reviewer` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`nama_petugas` varchar(120) NOT NULL,
	`user_petugas` varchar(80) NOT NULL,
	CONSTRAINT `petugas_reviewer_id` PRIMARY KEY(`id`)
);
