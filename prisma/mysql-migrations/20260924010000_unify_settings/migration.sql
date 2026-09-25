CREATE TABLE `settings` (
  `id` VARCHAR(200) NOT NULL,
  `image` LONGBLOB NOT NULL,
  `mimeType` VARCHAR(32) NOT NULL,
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Copy original bytes, MIME types and version timestamps without re-encoding.
INSERT INTO `settings` (`id`, `image`, `mimeType`, `updatedAt`)
SELECT CASE WHEN id = 'store' THEN 'logo' ELSE CONCAT('logo:', id) END,
       image, mimeType, updatedAt FROM `LogoSetting`;
INSERT INTO `settings` (`id`, `image`, `mimeType`, `updatedAt`)
SELECT CASE WHEN id = 'store' THEN 'qris' ELSE CONCAT('qris:', id) END,
       image, mimeType, updatedAt FROM `QrisSetting`;
