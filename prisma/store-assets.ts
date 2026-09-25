import { readFile } from "node:fs/promises";
import type { PrismaClient } from "../generated/prisma/client";
import { readUploadedImage } from "../lib/image-data";

export async function seedStoreAssets(prisma: PrismaClient, replace = false) {
  const [logoBytes, qrisBytes] = await Promise.all([
    readFile(new URL("../logo.jpeg", import.meta.url)),
    readFile(new URL("../QR Teras SB85.png", import.meta.url)),
  ]);
  const [logo, qris] = await Promise.all([
    readUploadedImage(
      new File([new Uint8Array(logoBytes)], "logo.jpeg", {
        type: "image/jpeg",
      }),
    ),
    readUploadedImage(
      new File([new Uint8Array(qrisBytes)], "QR Teras SB85.png", {
        type: "image/png",
      }),
    ),
  ]);
  // Normal seeding never replaces images that the admin has changed.
  await prisma.$transaction([
    prisma.setting.upsert({
      where: { id: "logo" },
      create: { id: "logo", ...logo },
      update: replace ? logo : {},
    }),
    prisma.setting.upsert({
      where: { id: "qris" },
      create: { id: "qris", ...qris },
      update: replace ? qris : {},
    }),
  ]);
}
