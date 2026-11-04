CREATE TABLE `schools` (
	`id` bigint unsigned AUTO_INCREMENT NOT NULL,
	`npsn` varchar(20) NOT NULL,
	`nama_sekolah` varchar(255) NOT NULL,
	`provinsi` varchar(120) NOT NULL,
	`kab_kota` varchar(120) NOT NULL,
	`kecamatan` varchar(120) NOT NULL,
	`jumlah_pid` int NOT NULL DEFAULT 0,
	CONSTRAINT `schools_id` PRIMARY KEY(`id`),
	CONSTRAINT `schools_npsn_unique` UNIQUE(`npsn`)
);
