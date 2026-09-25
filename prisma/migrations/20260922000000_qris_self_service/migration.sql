CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'QRIS');
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'REVIEW', 'PAID', 'REJECTED');
CREATE TYPE "OrderSource" AS ENUM ('CASHIER', 'SELF_SERVICE');
ALTER TABLE "Order"
  ADD COLUMN "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'CASH',
  ADD COLUMN "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PAID',
  ADD COLUMN "source" "OrderSource" NOT NULL DEFAULT 'CASHIER',
  ADD COLUMN "customerName" VARCHAR(80),
  ADD COLUMN "tableNumber" VARCHAR(20),
  ADD COLUMN "accessTokenHash" VARCHAR(64),
  ADD COLUMN "paymentNote" VARCHAR(300),
  ADD COLUMN "verifiedAt" TIMESTAMP(3),
  ADD COLUMN "verifiedBy" VARCHAR(80);
ALTER TABLE "Order" DROP CONSTRAINT "Order_amounts_check";
ALTER TABLE "Order" ADD CONSTRAINT "Order_amounts_check" CHECK (
  "total" > 0 AND "total" <= 1000000000 AND "paid" <= 1000000000 AND
  (("paymentStatus" = 'PAID' AND "paid" >= "total" AND "change" = "paid" - "total")
  OR ("paymentStatus" <> 'PAID' AND "paymentMethod" = 'QRIS' AND "paid" = 0 AND "change" = 0))
);
ALTER TABLE "Order" ADD CONSTRAINT "Order_kitchen_payment_check" CHECK ("status" = 'PENDING' OR "paymentStatus" = 'PAID');
CREATE UNIQUE INDEX "Order_accessTokenHash_key" ON "Order"("accessTokenHash");
CREATE INDEX "Order_paymentStatus_createdAt_idx" ON "Order"("paymentStatus", "createdAt");
CREATE TABLE "QrisSetting" (
  "id" TEXT NOT NULL DEFAULT 'store', "image" BYTEA NOT NULL, "mimeType" VARCHAR(32) NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "QrisSetting_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PaymentProof" (
  "id" TEXT NOT NULL, "orderId" TEXT NOT NULL, "image" BYTEA NOT NULL,
  "mimeType" VARCHAR(32) NOT NULL, "version" UUID NOT NULL, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PaymentProof_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PaymentProof_orderId_key" ON "PaymentProof"("orderId");
ALTER TABLE "PaymentProof" ADD CONSTRAINT "PaymentProof_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "PublicRateLimit" (
  "key" VARCHAR(200) NOT NULL, "attempts" INTEGER NOT NULL, "resetAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PublicRateLimit_pkey" PRIMARY KEY ("key")
);
