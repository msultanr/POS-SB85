"use server";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { readUploadedImage } from "@/lib/upload";
import { UserError } from "@/lib/validation";
import type { ActionResult } from "@/lib/types";
import { z } from "zod";

export async function saveStoreName(form: FormData): Promise<ActionResult> {
  await requireSession();
  const name = z
    .string()
    .trim()
    .min(2, "Nama toko minimal 2 karakter.")
    .max(120, "Nama toko maksimal 120 karakter.")
    .safeParse(form.get("storeName"));
  if (!name.success)
    return { success: false, error: name.error.issues[0].message };
  try {
    await db().setting.upsert({
      where: { id: "storeName" },
      create: { id: "storeName", value: name.data },
      update: { value: name.data },
    });
    revalidatePath("/", "layout");
    return { success: true, data: undefined };
  } catch (error) {
    console.error("saveStoreName", error);
    return {
      success: false,
      error: "Nama toko belum tersimpan. Silakan coba lagi.",
    };
  }
}

export async function saveLogoImage(form: FormData): Promise<ActionResult> {
  await requireSession();
  try {
    const data = await readUploadedImage(form.get("logo"));
    await db().setting.upsert({
      where: { id: "logo" },
      create: { id: "logo", ...data },
      update: data,
    });
    revalidatePath("/", "layout");
    return { success: true, data: undefined };
  } catch (error) {
    if (!(error instanceof UserError)) console.error("saveLogoImage", error);
    return {
      success: false,
      error:
        error instanceof UserError
          ? error.message
          : "Logo belum tersimpan. Silakan coba lagi.",
    };
  }
}
