CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED');
CREATE TABLE "Category" (
  "id" TEXT NOT NULL, "name" VARCHAR(80) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Product" (
  "id" TEXT NOT NULL, "name" VARCHAR(120) NOT NULL, "imageUrl" VARCHAR(2048),
  "price" INTEGER NOT NULL, "isAvailable" BOOLEAN NOT NULL DEFAULT true,
  "deletedAt" TIMESTAMP(3), "categoryId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Product_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Product_price_check" CHECK ("price" > 0 AND "price" <= 10000000)
);
CREATE TABLE "Order" (
  "id" TEXT NOT NULL, "number" SERIAL NOT NULL, "idempotencyKey" UUID NOT NULL,
  "requestHash" VARCHAR(64) NOT NULL, "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
  "total" INTEGER NOT NULL, "paid" INTEGER NOT NULL, "change" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Order_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Order_amounts_check" CHECK ("total" > 0 AND "total" <= 1000000000 AND "paid" >= "total" AND "paid" <= 1000000000 AND "change" = "paid" - "total")
);
CREATE TABLE "OrderItem" (
  "id" TEXT NOT NULL, "orderId" TEXT NOT NULL, "productId" TEXT NOT NULL,
  "productName" VARCHAR(120) NOT NULL, "unitPrice" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL, "subtotal" INTEGER NOT NULL,
  CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "OrderItem_amounts_check" CHECK ("unitPrice" > 0 AND "quantity" BETWEEN 1 AND 99 AND "subtotal" = "unitPrice" * "quantity")
);
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");
CREATE INDEX "Product_categoryId_deletedAt_idx" ON "Product"("categoryId", "deletedAt");
CREATE UNIQUE INDEX "Order_number_key" ON "Order"("number");
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
