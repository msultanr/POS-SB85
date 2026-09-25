import { AppShell } from "@/components/app-shell";
import { OrderBoard } from "@/components/orders/order-board";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth";
import { expireUnpaidOrders } from "@/lib/payment-expiry";
export const dynamic = "force-dynamic";
export default async function OrdersPage() {
  await requireSession();
  await expireUnpaidOrders();
  const [active, completed] = await Promise.all([
    db().order.findMany({
      where: {
        status: { in: ["PENDING", "PROCESSING"] },
        paymentStatus: { not: "EXPIRED" },
      },
      include: { items: true, proof: { select: { version: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db().order.findMany({
      where: { status: "COMPLETED" },
      include: { items: true, proof: { select: { version: true } } },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
  ]);
  const orders = [...active, ...completed].map((o) => ({
    id: o.id,
    code: o.code,
    number: o.number,
    status: o.status,
    total: o.total,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    source: o.source,
    customerName: o.customerName,
    whatsapp: o.whatsapp,
    fulfillment: o.fulfillment,
    deliveryAddress: o.deliveryAddress,
    scheduledAt: o.scheduledAt?.toISOString() ?? null,
    courierUrl: o.courierUrl,
    paymentNote: o.paymentNote,
    proofVersion: o.proof?.version ?? null,
    createdAt: o.createdAt.toISOString(),
    items: o.items.map((i) => ({
      id: i.id,
      name: i.productName,
      quantity: i.quantity,
      subtotal: i.subtotal,
    })),
  }));
  return (
    <AppShell active="orders">
      <OrderBoard orders={orders} />
    </AppShell>
  );
}
