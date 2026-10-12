"use server";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ActionResult } from "@/lib/types";

export async function setSelfOrderOpen(open: boolean): Promise<ActionResult> {
  await requireSession();
  if (typeof open !== "boolean")
    return { success: false, error: "Status pemesanan tidak valid." };
  try {
    const value = String(open);
    await db().setting.upsert({
      where: { id: "selfOrderOpen" },
      create: { id: "selfOrderOpen", value },
      update: { value },
    });
    revalidatePath("/order");
    revalidatePath("/admin/settings");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("setSelfOrderOpen", error);
    return {
      success: false,
      error: "Status pemesanan belum tersimpan. Coba lagi.",
    };
  }
}
