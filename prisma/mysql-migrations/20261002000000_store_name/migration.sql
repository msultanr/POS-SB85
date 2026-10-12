ALTER TABLE `settings`
  MODIFY `image` LONGBLOB NULL,
  MODIFY `mimeType` VARCHAR(32) NULL,
  ADD COLUMN `value` VARCHAR(120) NULL;

INSERT INTO `settings` (`id`, `value`, `updatedAt`)
VALUES ('storeName', 'Teras SB85', CURRENT_TIMESTAMP(3));
