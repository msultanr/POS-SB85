import { notFound } from "next/navigation";
import { findCustomerOrder } from "@/lib/payment-access";
import { CustomerPayment } from "@/components/payments/customer-payment";
import { db } from "@/lib/db";
import { paymentDeadline } from "@/lib/payment-deadline";
export const dynamic = "force-dynamic";
export default async function CustomerPaymentPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const order = await findCustomerOrder(token);
  if (!order || order.source !== "SELF_SERVICE") notFound();
  const qris = await db().setting.findUnique({
    where: { id: "qris" },
    select: { updatedAt: true },
  });
  return (
    <CustomerPayment
      token={token}
      qrisVersion={qris?.updatedAt.toISOString() ?? null}
      order={{
        number: order.number,
        total: order.total,
        customerName: order.customerName,
        id: order.id,
        code: order.code,
        whatsapp: order.whatsapp,
        fulfillment: order.fulfillment,
        deliveryAddress: order.deliveryAddress,
        scheduledAt: order.scheduledAt?.toISOString() ?? null,
        courierUrl: order.courierUrl,
        paymentStatus: order.paymentStatus,
        paymentExpiresAt: paymentDeadline(order.createdAt).toISOString(),
        status: order.status,
        paymentNote: order.paymentNote,
        items: order.items.map((i) => ({
          id: i.id,
          name: i.productName,
          quantity: i.quantity,
          subtotal: i.subtotal,
        })),
      }}
    />
  );
}
