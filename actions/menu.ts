"use server";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { menuSchema, type MenuInput } from "@/lib/validation";
import type { ActionResult } from "@/lib/types";
function refresh() {
  revalidatePath("/admin/menu");
  revalidatePath("/pos");
  revalidatePath("/order");
}
export async function saveProduct(
  id: string | null,
  input: MenuInput,
): Promise<ActionResult> {
  await requireSession();
  const parsed = menuSchema.safeParse(input);
  if (!parsed.success)
    return { success: false, error: parsed.error.issues[0].message };
  if (id !== null && (typeof id !== "string" || id.length > 64))
    return { success: false, error: "ID menu tidak valid." };
  try {
    const data = { ...parsed.data, imageUrl: parsed.data.imageUrl || null };
    if (!(await db().category.findUnique({ where: { id: data.categoryId } })))
      return { success: false, error: "Kategori tidak ditemukan." };
    if (id) {
      const result = await db().product.updateMany({
        where: { id, deletedAt: null },
        data,
      });
      if (!result.count)
        return { success: false, error: "Menu sudah dihapus." };
    } else await db().product.create({ data });
    refresh();
    return { success: true, data: undefined };
  } catch (error) {
    console.error("saveProduct", error);
    return {
      success: false,
      error: "Menu belum tersimpan. Silakan coba lagi.",
    };
  }
}
export async function deleteProduct(id: string): Promise<ActionResult> {
  await requireSession();
  if (typeof id !== "string" || !id || id.length > 64)
    return { success: false, error: "ID menu tidak valid." };
  try {
    // Soft delete keeps historical receipts and foreign keys intact.
    await db().product.updateMany({
      where: { id, deletedAt: null },
      data: { deletedAt: new Date(), isAvailable: false },
    });
    refresh();
    return { success: true, data: undefined };
  } catch (error) {
    console.error("deleteProduct", error);
    return { success: false, error: "Menu belum terhapus. Silakan coba lagi." };
  }
}
export async function createCategory(
  name: string,
): Promise<ActionResult<{ id: string; name: string }>> {
  await requireSession();
  if (
    typeof name !== "string" ||
    name.trim().length < 2 ||
    name.trim().length > 80
  )
    return { success: false, error: "Nama kategori harus 2–80 karakter." };
  try {
    const category = await db().category.upsert({
      where: { name: name.trim() },
      update: {},
      create: { name: name.trim() },
      select: { id: true, name: true },
    });
    refresh();
    return { success: true, data: category };
  } catch (error) {
    console.error("createCategory", error);
    return { success: false, error: "Kategori belum tersimpan." };
  }
}
