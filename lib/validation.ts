import { z } from "zod";
export const MAX_MONEY = 1_000_000_000;
export const checkoutSchema = z
  .object({
    idempotencyKey: z.uuid(),
    paid: z.number().int().min(0).max(MAX_MONEY),
    paymentMethod: z.enum(["CASH", "QRIS"]).optional(),
    items: z
      .array(
        z.object({
          productId: z.string().min(1).max(64),
          quantity: z.number().int().min(1).max(99),
          expectedPrice: z.number().int().min(1).max(MAX_MONEY),
        }),
      )
      .min(1)
      .max(100),
  })
  .refine(
    ({ items }) => new Set(items.map((i) => i.productId)).size === items.length,
    "Produk duplikat.",
  );
export const menuSchema = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter.").max(120),
  categoryId: z.string().min(1, "Pilih kategori."),
  price: z.number().int().min(1, "Harga harus lebih dari nol.").max(10_000_000),
  imageUrl: z.union([
    z.literal(""),
    z
      .url({ protocol: /^https$/, error: "Gunakan URL HTTPS yang valid." })
      .max(2048),
  ]),
  isAvailable: z.boolean(),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;
export const customerSchema = z
  .object({
    customerName: z
      .string()
      .trim()
      .min(2, "Isi nama pemesan (minimal 2 karakter).")
      .max(80),
    whatsapp: z
      .string()
      .trim()
      .max(24)
      .transform((s) => s.replace(/[\s()+-]/g, "").replace(/^0/, "62"))
      .pipe(
        z
          .string()
          .regex(
            /^62[1-9][0-9]{7,12}$/,
            "Isi nomor WhatsApp Indonesia yang valid (08… atau +62…).",
          ),
      ),
    fulfillment: z.enum(["PICKUP", "DELIVERY"]),
    deliveryAddress: z.string().trim().max(500),
    scheduledAt: z.iso.datetime({ offset: true }),
  })
  .refine(
    (v) => v.fulfillment !== "DELIVERY" || v.deliveryAddress.length >= 10,
    {
      message: "Isi alamat pengiriman lengkap (minimal 10 karakter).",
      path: ["deliveryAddress"],
    },
  );
export type CustomerInput = z.infer<typeof customerSchema>;
export type MenuInput = z.infer<typeof menuSchema>;
export class UserError extends Error {}
export function calculateSale(
  items: { price: number; quantity: number }[],
  paid: number,
) {
  const total = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  if (!Number.isSafeInteger(total) || total < 1 || total > MAX_MONEY)
    throw new UserError("Total transaksi di luar batas.");
  if (paid < total) throw new UserError("Uang bayar belum cukup.");
  return { total, paid, change: paid - total };
}
