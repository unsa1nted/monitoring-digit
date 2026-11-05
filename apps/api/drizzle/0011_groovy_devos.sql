ALTER TABLE `bapp_school_counts` ADD `serial_numbers` json;
--> statement-breakpoint
UPDATE `bapp_school_counts` SET `status` = 'pending', `claimed_at` = NULL, `checked_at` = NULL, `message` = NULL;
--> statement-breakpoint
UPDATE `bapp_scans` AS scans
INNER JOIN `bapp_storages` AS storage ON storage.id = scans.storage_id
SET scans.validation_status = 'pending', scans.claimed_at = NULL, scans.checked_at = NULL,
    scans.validation_message = 'Menunggu validasi ulang berdasarkan serial number.'
WHERE storage.vendor = 'Hisense';
