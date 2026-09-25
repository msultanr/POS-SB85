import {
  DELIVERY_NOTICE,
  scheduleLabel,
  type FulfillmentView,
} from "@/lib/fulfillment";
export function FulfillmentDetails({ order }: { order: FulfillmentView }) {
  return (
    <div className="space-y-2 rounded-xl bg-muted/50 p-3 text-sm">
      <p className="break-all">
        <strong>Kode pesanan:</strong>{" "}
        <span className="select-all font-mono font-semibold tracking-wide">
          {order.code}
        </span>
      </p>
      <p className="font-semibold">
        {order.fulfillment === "DELIVERY" ? "Delivery" : "Pick up"} ·{" "}
        {scheduleLabel(order.scheduledAt)}
      </p>
      {order.whatsapp && (
        <p>
          WhatsApp:{" "}
          <a
            className="underline"
            href={`https://wa.me/${order.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            +{order.whatsapp}
          </a>
        </p>
      )}
      {order.fulfillment === "DELIVERY" && (
        <>
          <p className="whitespace-pre-wrap break-words">
            {order.deliveryAddress}
          </p>
          <p className="text-xs text-amber-900">{DELIVERY_NOTICE}</p>
          {order.courierUrl && (
            <a
              className="block py-2 font-semibold text-primary underline"
              href={order.courierUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Buka pelacakan kurir
            </a>
          )}
        </>
      )}
    </div>
  );
}
