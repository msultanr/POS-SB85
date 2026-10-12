import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export const ORDER_CLOSED_MESSAGE =
  "Pemesanan online sedang ditutup. Silakan kembali saat toko membuka pemesanan.";

export async function isSelfOrderOpen(
  client: Pick<Prisma.TransactionClient, "setting"> = db(),
) {
  const setting = await client.setting.findUnique({
    where: { id: "selfOrderOpen" },
    select: { value: true },
  });
  // Preserve the existing open behavior until admin first saves this setting.
  return setting === null || setting.value === "true";
}
