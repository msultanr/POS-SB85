import "server-only";
import { cache } from "react";
import { db } from "@/lib/db";
export const getStoreName = cache(async () => {
  const setting = await db().setting.findUnique({
    where: { id: "storeName" },
    select: { value: true },
  });
  return setting?.value?.trim() || "Teras SB85";
});
export const getLogoVersion = cache(async () => {
  const logo = await db().setting.findUnique({
    where: { id: "logo" },
    select: { updatedAt: true },
  });
  return logo?.updatedAt.toISOString() ?? null;
});
