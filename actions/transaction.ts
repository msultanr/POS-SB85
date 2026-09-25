"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import type { CheckoutInput } from "@/lib/validation";
import { createOrder } from "@/lib/checkout";
import type { ActionResult, Receipt } from "@/lib/types";

export async function processTransaction(
  input: CheckoutInput,
): Promise<ActionResult<Receipt>> {
  await requireSession();
  return createOrder(input, "CASHIER");
}

export async function advanceOrder(
  id: string,
  currentStatus: "PENDING" | "PROCESSING",
): Promise<ActionResult> {
  await requireSession();
  const parsed = z
    .object({
      id: z.string().min(1).max(64),
      currentStatus: z.enum(["PENDING", "PROCESSING"]),
    })
    .safeParse({ id, currentStatus });
  if (!parsed.success)
    return { success: false, error: "Status pesanan tidak valid." };
  try {
    const result = await db().order.updateMany({
      where: { id, status: currentStatus, paymentStatus: "PAID" },
      data: {
        status: currentStatus === "PENDING" ? "PROCESSING" : "COMPLETED",
      },
    });
    revalidatePath("/orders");
    if (!result.count)
      return {
        success: false,
        error: "Status sudah berubah. Daftar pesanan telah diperbarui.",
      };
    return { success: true, data: undefined };
  } catch (error) {
    console.error("advanceOrder", error);
    return { success: false, error: "Status belum diperbarui. Coba lagi." };
  }
}
