CREATE TYPE "Fulfillment" AS ENUM ('PICKUP', 'DELIVERY');
ALTER TABLE "Order"
  ADD COLUMN "whatsapp" VARCHAR(20),
  ADD COLUMN "fulfillment" "Fulfillment" NOT NULL DEFAULT 'PICKUP',
  ADD COLUMN "deliveryAddress" VARCHAR(500),
  ADD COLUMN "scheduledAt" TIMESTAMP(3),
  ADD COLUMN "courierUrl" VARCHAR(2048);
ALTER TABLE "Order" ADD CONSTRAINT "delivery_details_required" CHECK (
  "fulfillment" <> 'DELIVERY' OR
  ("whatsapp" IS NOT NULL AND "scheduledAt" IS NOT NULL AND "deliveryAddress" IS NOT NULL AND length(trim("deliveryAddress")) >= 10)
);
