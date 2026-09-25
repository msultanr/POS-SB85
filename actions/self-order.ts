"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { createOrder } from "@/lib/checkout";
import { findCustomerOrder } from "@/lib/payment-access";
import { limitPublicRequest } from "@/lib/public-rate-limit";
import { readUploadedImage } from "@/lib/upload";
import { paymentCutoff } from "@/lib/payment-deadline";
import {
  customerSchema,
  UserError,
  type CheckoutInput,
  type CustomerInput,
} from "@/lib/validation";
import type { ActionResult, Receipt } from "@/lib/types";

export async function checkoutSelfOrder(
  input: Omit<CheckoutInput, "paid" | "paymentMethod"> & CustomerInput,
): Promise<ActionResult<Receipt & { accessToken?: string }>> {
  const customer = customerSchema.safeParse(input);
  if (!customer.success)
    return { success: false, error: customer.error.issues[0].message };
  try {
    await limitPublicRequest("checkout");
    return await createOrder(
      {
        idempotencyKey: input.idempotencyKey,
        items: input.items,
        paid: 0,
        paymentMethod: "QRIS",
      },
      "SELF_SERVICE",
      customer.data,
    );
  } catch (error) {
    if (!(error instanceof UserError))
      console.error("checkoutSelfOrder", error);
    return {
      success: false,
      error:
        error instanceof UserError
          ? error.message
          : "Pesanan belum dapat dibuat. Silakan coba lagi.",
    };
  }
}

export async function uploadPaymentProof(
  token: string,
  form: FormData,
): Promise<ActionResult> {
  try {
    const order = await findCustomerOrder(token);
    if (
      !order ||
      order.source !== "SELF_SERVICE" ||
      order.paymentMethod !== "QRIS"
    )
      throw new UserError("Tautan pesanan tidak valid.");
    if (order.paymentStatus === "EXPIRED")
      throw new UserError(
        "Pesanan kedaluwarsa. Jangan membayar; buat pesanan baru. Jika sudah membayar, hubungi admin.",
      );
    if (!["UNPAID", "REJECTED"].includes(order.paymentStatus))
      throw new UserError(
        "Bukti sudah dikirim atau pembayaran sudah diverifikasi. Perbarui halaman.",
      );
    await limitPublicRequest("upload", order.id);
    const file = await readUploadedImage(form.get("proof"));
    await db().$transaction(async (tx) => {
      // Conditional update locks the order before changing the proof, preventing review/upload races.
      const updated = await tx.order.updateMany({
        where: {
          id: order.id,
          paymentStatus: { in: ["UNPAID", "REJECTED"] },
          createdAt: { gt: paymentCutoff() },
        },
        data: { paymentStatus: "REVIEW", paymentNote: null },
      });
      if (!updated.count)
        throw new UserError(
          "Waktu pembayaran habis atau status sudah berubah. Perbarui halaman. Jika sudah membayar, hubungi admin.",
        );
      const data = { ...file, version: randomUUID() };
      await tx.paymentProof.upsert({
        where: { orderId: order.id },
        create: { ...data, orderId: order.id },
        update: data,
      });
    });
    revalidatePath(`/order/${token}`);
    revalidatePath("/orders");
    return { success: true, data: undefined };
  } catch (error) {
    if (!(error instanceof UserError))
      console.error("uploadPaymentProof", error);
    return {
      success: false,
      error:
        error instanceof UserError
          ? error.message
          : "Bukti pembayaran belum tersimpan. Silakan coba lagi.",
    };
  }
}
