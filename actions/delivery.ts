"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { limitPublicRequest } from "@/lib/public-rate-limit";
import { UserError } from "@/lib/validation";
import type { ActionResult } from "@/lib/types";
import { orderCodeSchema } from "@/lib/order-code";
import { expireUnpaidOrders } from "@/lib/payment-expiry";

export async function saveCourierLink(
  id: string,
  url: string,
): Promise<ActionResult> {
  await requireSession();
  const parsed = z
    .object({
      id: z.string().min(1).max(64),
      url: z
        .url({ protocol: /^https$/ })
        .max(2048)
        .refine((s) => {
          const u = new URL(s);
          return !u.username && !u.password;
        }),
    })
    .safeParse({ id, url });
  if (!parsed.success)
    return {
      success: false,
      error: "Masukkan tautan HTTPS GoSend/GrabExpress yang valid.",
    };
  try {
    const result = await db().order.updateMany({
      where: {
        id,
        fulfillment: "DELIVERY",
        paymentStatus: "PAID",
        status: { in: ["PROCESSING", "COMPLETED"] },
      },
      data: { courierUrl: parsed.data.url },
    });
    if (!result.count)
      return {
        success: false,
        error:
          "Tautan hanya dapat diisi untuk delivery lunas yang sudah diproses atau siap.",
      };
    revalidatePath("/orders");
    return { success: true, data: undefined };
  } catch {
    return { success: false, error: "Tautan belum tersimpan. Coba lagi." };
  }
}

export type DeliveryTracking = {
  code: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED";
  paymentStatus: "UNPAID" | "REVIEW" | "PAID" | "REJECTED" | "EXPIRED";
  scheduledAt: string | null;
  courierUrl: string | null;
};
export async function trackDelivery(
  orderCode: string,
): Promise<ActionResult<DeliveryTracking>> {
  try {
    await limitPublicRequest("tracking");
    const parsed = orderCodeSchema.safeParse(orderCode);
    if (!parsed.success)
      return {
        success: false,
        error:
          "Kode pesanan delivery tidak ditemukan. Periksa kembali kode Anda.",
      };
    // Do not select customer details, private payment token, proof, or address.
    await expireUnpaidOrders();
    const order = await db().order.findFirst({
      where: { code: parsed.data, fulfillment: "DELIVERY" },
      select: {
        code: true,
        status: true,
        paymentStatus: true,
        scheduledAt: true,
        courierUrl: true,
      },
    });
    if (!order)
      return {
        success: false,
        error:
          "Kode pesanan delivery tidak ditemukan. Periksa kembali kode Anda.",
      };
    return {
      success: true,
      data: { ...order, scheduledAt: order.scheduledAt?.toISOString() ?? null },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof UserError
          ? error.message
          : "Status belum dapat dimuat. Silakan coba lagi.",
    };
  }
}
