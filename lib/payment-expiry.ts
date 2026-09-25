import "server-only";
import { db } from "@/lib/db";
import { paymentCutoff } from "@/lib/payment-deadline";

// Lazy reconciliation works on serverless without a continuously running timer.
// Conditional writes in upload/review also enforce the deadline atomically.
export async function expireUnpaidOrders() {
  await db().order.updateMany({
    where: {
      paymentMethod: "QRIS",
      paymentStatus: { in: ["UNPAID", "REJECTED"] },
      createdAt: { lte: paymentCutoff() },
    },
    data: { paymentStatus: "EXPIRED" },
  });
}
