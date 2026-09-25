"use server";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { readUploadedImage } from "@/lib/upload";
import { UserError } from "@/lib/validation";
import type { ActionResult } from "@/lib/types";

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
