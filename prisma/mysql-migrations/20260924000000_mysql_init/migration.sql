-- CreateTable
CREATE TABLE `QrisSetting` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'store',
    `image` LONGBLOB NOT NULL,
    `mimeType` VARCHAR(32) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LogoSetting` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'store',
    `image` LONGBLOB NOT NULL,
    `mimeType` VARCHAR(32) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PaymentProof` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `image` LONGBLOB NOT NULL,
    `mimeType` VARCHAR(32) NOT NULL,
    `version` CHAR(36) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PaymentProof_orderId_key`(`orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PublicRateLimit` (
    `key` VARCHAR(200) NOT NULL,
    `attempts` INTEGER NOT NULL,
    `resetAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Admin` (
    `id` VARCHAR(191) NOT NULL,
    `username` VARCHAR(80) NOT NULL,
    `passwordHash` VARCHAR(256) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Admin_username_key`(`username`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Category` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Category_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Product` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `imageUrl` VARCHAR(2048) NULL,
    `price` INTEGER NOT NULL,
    `isAvailable` BOOLEAN NOT NULL DEFAULT true,
    `deletedAt` DATETIME(3) NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Product_categoryId_deletedAt_idx`(`categoryId`, `deletedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Order` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(13) NOT NULL,
    `number` INTEGER NOT NULL AUTO_INCREMENT,
    `idempotencyKey` CHAR(36) NOT NULL,
    `requestHash` VARCHAR(64) NOT NULL,
    `status` ENUM('PENDING', 'PROCESSING', 'COMPLETED') NOT NULL DEFAULT 'PENDING',
    `total` INTEGER NOT NULL,
    `paid` INTEGER NOT NULL,
    `change` INTEGER NOT NULL,
    `paymentMethod` ENUM('CASH', 'QRIS') NOT NULL DEFAULT 'CASH',
    `paymentStatus` ENUM('UNPAID', 'REVIEW', 'PAID', 'REJECTED') NOT NULL DEFAULT 'PAID',
    `source` ENUM('CASHIER', 'SELF_SERVICE') NOT NULL DEFAULT 'CASHIER',
    `customerName` VARCHAR(80) NULL,
    `tableNumber` VARCHAR(20) NULL,
    `whatsapp` VARCHAR(20) NULL,
    `fulfillment` ENUM('PICKUP', 'DELIVERY') NOT NULL DEFAULT 'PICKUP',
    `deliveryAddress` VARCHAR(500) NULL,
    `scheduledAt` DATETIME(3) NULL,
    `courierUrl` VARCHAR(2048) NULL,
    `accessTokenHash` VARCHAR(64) NULL,
    `paymentNote` VARCHAR(300) NULL,
    `verifiedAt` DATETIME(3) NULL,
    `verifiedBy` VARCHAR(80) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Order_code_key`(`code`),
    UNIQUE INDEX `Order_number_key`(`number`),
    UNIQUE INDEX `Order_idempotencyKey_key`(`idempotencyKey`),
    UNIQUE INDEX `Order_accessTokenHash_key`(`accessTokenHash`),
    INDEX `Order_status_createdAt_idx`(`status`, `createdAt`),
    INDEX `Order_paymentStatus_createdAt_idx`(`paymentStatus`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderNotification` (
    `id` VARCHAR(191) NOT NULL,
    `adminId` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `readAt` DATETIME(3) NULL,

    INDEX `OrderNotification_adminId_readAt_createdAt_idx`(`adminId`, `readAt`, `createdAt`),
    UNIQUE INDEX `OrderNotification_adminId_orderId_key`(`adminId`, `orderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `OrderItem` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `productName` VARCHAR(120) NOT NULL,
    `unitPrice` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,
    `subtotal` INTEGER NOT NULL,

    INDEX `OrderItem_orderId_idx`(`orderId`),
    INDEX `OrderItem_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `PaymentProof` ADD CONSTRAINT `PaymentProof_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderNotification` ADD CONSTRAINT `OrderNotification_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `Admin`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderNotification` ADD CONSTRAINT `OrderNotification_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Order`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;


-- Preserve database-level integrity checks from the PostgreSQL implementation.
ALTER TABLE `Product` ADD CONSTRAINT `Product_price_check` CHECK (price > 0 AND price <= 10000000);
ALTER TABLE `Order` ADD CONSTRAINT `Order_amounts_check` CHECK (
  total > 0 AND total <= 1000000000 AND paid >= 0 AND paid <= 1000000000 AND `change` >= 0 AND
  ((paymentStatus = 'PAID' AND paid >= total AND `change` = paid - total)
    OR (paymentStatus <> 'PAID' AND paymentMethod = 'QRIS' AND paid = 0 AND `change` = 0))
);
ALTER TABLE `Order` ADD CONSTRAINT `Order_kitchen_payment_check` CHECK (status = 'PENDING' OR paymentStatus = 'PAID');
ALTER TABLE `Order` ADD CONSTRAINT `delivery_details_required` CHECK (
  fulfillment <> 'DELIVERY' OR (whatsapp IS NOT NULL AND scheduledAt IS NOT NULL AND deliveryAddress IS NOT NULL AND CHAR_LENGTH(TRIM(deliveryAddress)) >= 10)
);
ALTER TABLE `Order` ADD CONSTRAINT `Order_code_format_check` CHECK (REGEXP_LIKE(code, '^SB85-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$', 'c'));
ALTER TABLE `OrderItem` ADD CONSTRAINT `OrderItem_amounts_check` CHECK (unitPrice > 0 AND quantity BETWEEN 1 AND 99 AND subtotal = unitPrice * quantity);
