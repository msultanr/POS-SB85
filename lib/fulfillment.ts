export const DELIVERY_NOTICE =
  "Biaya pengiriman ditanggung pembeli dan dibayar COD langsung kepada kurir. Total pembayaran QRIS hanya untuk pesanan, belum termasuk ongkir.";
export function scheduleLabel(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("id-ID", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Jakarta",
      }).format(new Date(value)) + " WIB"
    : "Segera / ambil di kasir";
}
export type FulfillmentView = {
  id: string;
  code: string;
  whatsapp: string | null;
  fulfillment: "PICKUP" | "DELIVERY";
  deliveryAddress: string | null;
  scheduledAt: string | null;
  courierUrl: string | null;
};
