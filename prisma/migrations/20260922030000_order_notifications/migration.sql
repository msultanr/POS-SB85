CREATE TABLE "OrderNotification" (
  "id" TEXT NOT NULL,
  "adminId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3),
  CONSTRAINT "OrderNotification_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "OrderNotification_adminId_orderId_key" ON "OrderNotification"("adminId", "orderId");
CREATE INDEX "OrderNotification_adminId_readAt_createdAt_idx" ON "OrderNotification"("adminId", "readAt", "createdAt");
ALTER TABLE "OrderNotification" ADD CONSTRAINT "OrderNotification_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderNotification" ADD CONSTRAINT "OrderNotification_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
