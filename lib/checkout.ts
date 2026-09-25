import "server-only";
import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { paymentToken, tokenHash } from "@/lib/payment-access";
import {
  calculateSale,
  checkoutSchema,
  MAX_MONEY,
  UserError,
  type CheckoutInput,
  type CustomerInput,
} from "@/lib/validation";
import type { ActionResult, Receipt } from "@/lib/types";
import { generateOrderCode } from "@/lib/generate-order-code";
import { expireUnpaidOrders } from "@/lib/payment-expiry";
import { paymentDeadline } from "@/lib/payment-deadline";

export async function createOrder(
  input: CheckoutInput,
  source: "CASHIER" | "SELF_SERVICE",
  customer?: CustomerInput,
): Promise<ActionResult<Receipt & { accessToken?: string }>> {
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success)
    return {
      success: false,
      error: "Periksa kembali item dan nominal pembayaran.",
    };
  const { items, paid, idempotencyKey } = parsed.data;
  const paymentMethod =
    source === "SELF_SERVICE" ? "QRIS" : (parsed.data.paymentMethod ?? "CASH");
  const requestHash = createHash("sha256")
    .update(
      JSON.stringify({
        paid: paymentMethod === "CASH" ? paid : 0,
        items: [...items].sort((a, b) =>
          a.productId.localeCompare(b.productId),
        ),
        ...(paymentMethod === "QRIS"
          ? { paymentMethod, source, customer }
          : {}),
      }),
    )
    .digest("hex");
  try {
    await expireUnpaidOrders();
    const accessToken =
      source === "SELF_SERVICE" ? paymentToken(idempotencyKey) : undefined;
    let receipt: Receipt | undefined;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        receipt = await db().$transaction(
          async (tx) => {
            const existing = await tx.order.findUnique({
              where: { idempotencyKey },
            });
            if (existing) {
              if (
                accessToken &&
                existing.accessTokenHash !== tokenHash(accessToken)
              )
                throw new UserError(
                  "Pesanan sudah dibuat. Gunakan tautan pembayaran sebelumnya atau hubungi kasir.",
                );
              if (
                existing.requestHash !== requestHash ||
                existing.source !== source
              )
                throw new UserError(
                  "Kunci transaksi sudah digunakan untuk pesanan berbeda.",
                );
              return {
                id: existing.id,
                code: existing.code,
                number: existing.number,
                total: existing.total,
                paid: existing.paid,
                change: existing.change,
                paymentMethod: existing.paymentMethod,
                paymentStatus: existing.paymentStatus,
                paymentExpiresAt:
                  existing.paymentMethod === "QRIS"
                    ? paymentDeadline(existing.createdAt).toISOString()
                    : null,
              };
            }
            if (
              paymentMethod === "QRIS" &&
              !(await tx.setting.findUnique({
                where: { id: "qris" },
                select: { id: true },
              }))
            )
              throw new UserError(
                "Pembayaran QRIS belum tersedia. Hubungi kasir.",
              );
            if (customer) {
              const scheduled = new Date(customer.scheduledAt).getTime();
              if (
                !Number.isFinite(scheduled) ||
                scheduled <= Date.now() ||
                scheduled > Date.now() + 30 * 86400000
              )
                throw new UserError(
                  "Pilih jadwal setelah waktu sekarang, maksimal 30 hari ke depan (WIB).",
                );
            }
            const products = await tx.product.findMany({
              where: {
                id: { in: items.map((i) => i.productId) },
                deletedAt: null,
                isAvailable: true,
              },
            });
            const lines = items.map((item) => {
              const product = products.find((p) => p.id === item.productId);
              if (!product)
                throw new UserError(
                  "Ada menu yang sudah habis atau dihapus. Perbarui keranjang.",
                );
              if (product.price !== item.expectedPrice)
                throw new UserError(
                  `Harga ${product.name} berubah. Hapus lalu tambahkan kembali menu tersebut.`,
                );
              return {
                productId: product.id,
                productName: product.name,
                unitPrice: product.price,
                quantity: item.quantity,
                subtotal: product.price * item.quantity,
              };
            });
            const prices = lines.map((i) => ({
              price: i.unitPrice,
              quantity: i.quantity,
            }));
            const total = calculateSale(prices, MAX_MONEY).total;
            const amounts =
              paymentMethod === "CASH"
                ? calculateSale(prices, paid)
                : { total, paid: 0, change: 0 };
            const order = await tx.order.create({
              data: {
                ...amounts,
                code: generateOrderCode(),
                idempotencyKey,
                requestHash,
                source,
                paymentMethod,
                paymentStatus: paymentMethod === "CASH" ? "PAID" : "UNPAID",
                customerName: customer?.customerName,
                whatsapp: customer?.whatsapp,
                fulfillment: customer?.fulfillment ?? "PICKUP",
                deliveryAddress:
                  customer?.fulfillment === "DELIVERY"
                    ? customer.deliveryAddress
                    : null,
                scheduledAt: customer ? new Date(customer.scheduledAt) : null,
                accessTokenHash: accessToken ? tokenHash(accessToken) : null,
                items: { create: lines },
              },
              select: {
                id: true,
                code: true,
                number: true,
                total: true,
                paid: true,
                change: true,
                paymentMethod: true,
                paymentStatus: true,
                createdAt: true,
              },
            });
            if (source === "SELF_SERVICE") {
              const admins = await tx.admin.findMany({ select: { id: true } });
              if (admins.length)
                await tx.orderNotification.createMany({
                  data: admins.map((admin) => ({
                    adminId: admin.id,
                    orderId: order.id,
                  })),
                });
            }
            return {
              id: order.id,
              code: order.code,
              number: order.number,
              total: order.total,
              paid: order.paid,
              change: order.change,
              paymentMethod: order.paymentMethod,
              paymentStatus: order.paymentStatus,
              paymentExpiresAt:
                paymentMethod === "QRIS"
                  ? paymentDeadline(order.createdAt).toISOString()
                  : null,
            };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
        break;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          ["P2034", "P2002"].includes(error.code) &&
          attempt < 2
        )
          continue;
        throw error;
      }
    }
    if (!receipt) throw new Error("Transaction retry exhausted");
    revalidatePath("/orders");
    revalidatePath("/pos");
    return {
      success: true,
      data: { ...receipt, ...(accessToken ? { accessToken } : {}) },
    };
  } catch (error) {
    if (error instanceof UserError)
      return { success: false, error: error.message };
    console.error("createOrder", error);
    return {
      success: false,
      error:
        "Transaksi belum dapat dikonfirmasi. Coba lagi dengan keranjang yang sama; pesanan tidak akan digandakan.",
    };
  }
}
