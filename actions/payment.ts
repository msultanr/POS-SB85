"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { readUploadedImage } from "@/lib/upload";
import { MAX_MONEY, UserError } from "@/lib/validation";
import type { ActionResult } from "@/lib/types";
import { expireUnpaidOrders } from "@/lib/payment-expiry";
import { paymentCutoff } from "@/lib/payment-deadline";

export async function saveQrisImage(form: FormData): Promise<ActionResult> {
  await requireSession();
  try {
    const data = await readUploadedImage(form.get("qris"));
    await db().setting.upsert({
      where: { id: "qris" },
      create: { id: "qris", ...data },
      update: data,
    });
    revalidatePath("/admin/settings");
    revalidatePath("/order");
    revalidatePath("/pos");
    return { success: true, data: undefined };
  } catch (error) {
    if (!(error instanceof UserError)) console.error("saveQrisImage", error);
    return {
      success: false,
      error:
        error instanceof UserError
          ? error.message
          : "QRIS belum tersimpan. Silakan coba lagi.",
    };
  }
}
const reviewSchema = z.object({
  id: z.string().min(1).max(64),
  expectedStatus: z.enum(["UNPAID", "REVIEW", "REJECTED"]),
  proofVersion: z.uuid().nullable(),
  decision: z.enum(["APPROVE", "REJECT"]),
  receivedAmount: z.number().int().min(0).max(MAX_MONEY),
  note: z.string().trim().max(300),
});
export type ReviewInput = z.infer<typeof reviewSchema>;
export async function reviewPayment(input: ReviewInput): Promise<ActionResult> {
  const admin = await requireSession();
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: "Data verifikasi tidak valid." };
  const { id, expectedStatus, proofVersion, decision, receivedAmount, note } =
    parsed.data;
  try {
    await expireUnpaidOrders();
    await db().$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        select: { total: true, source: true, paymentMethod: true },
      });
      if (!order || order.paymentMethod !== "QRIS")
        throw new UserError("Pesanan QRIS tidak ditemukan.");
      if (
        order.source === "SELF_SERVICE" &&
        (expectedStatus !== "REVIEW" || !proofVersion)
      )
        throw new UserError("Tunggu pelanggan mengunggah bukti pembayaran.");
      if (decision === "APPROVE" && receivedAmount !== order.total)
        throw new UserError(
          "Nominal dana masuk harus sama dengan total pesanan.",
        );
      if (decision === "REJECT" && note.length < 3)
        throw new UserError("Isi alasan penolakan minimal 3 karakter.");
      const updated = await tx.order.updateMany({
        where: {
          id,
          paymentStatus: expectedStatus,
          ...(expectedStatus === "REVIEW"
            ? {}
            : { createdAt: { gt: paymentCutoff() } }),
          proof: proofVersion
            ? { is: { version: proofVersion } }
            : { is: null },
        },
        data:
          decision === "APPROVE"
            ? {
                paymentStatus: "PAID",
                paid: order.total,
                change: 0,
                verifiedAt: new Date(),
                verifiedBy: admin.username,
                paymentNote: null,
              }
            : { paymentStatus: "REJECTED", paymentNote: note },
      });
      if (!updated.count)
        throw new UserError(
          "Status atau bukti pembayaran sudah berubah. Perbarui halaman sebelum memverifikasi.",
        );
    });
    // A rejected proof does not restart the original payment window.
    if (decision === "REJECT") await expireUnpaidOrders();
    revalidatePath("/orders");
    revalidatePath("/pos");
    revalidatePath("/order/[token]", "page");
    return { success: true, data: undefined };
  } catch (error) {
    if (!(error instanceof UserError)) console.error("reviewPayment", error);
    return {
      success: false,
      error:
        error instanceof UserError
          ? error.message
          : "Verifikasi belum tersimpan. Silakan coba lagi.",
    };
  }
}
