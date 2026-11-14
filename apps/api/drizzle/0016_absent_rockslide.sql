ALTER TABLE `master_bapp`
  DROP PRIMARY KEY,
  ADD COLUMN `id` bigint unsigned NOT NULL AUTO_INCREMENT FIRST,
  ADD PRIMARY KEY (`id`),
  ADD CONSTRAINT `master_bapp_id_transaksi_unique` UNIQUE (`id_transaksi`);
