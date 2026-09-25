import sharp from "sharp";
import { UserError } from "@/lib/validation";
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export async function readUploadedImage(value: FormDataEntryValue | null) {
  if (
    !(value instanceof File) ||
    value.size < 1 ||
    value.size > MAX_IMAGE_BYTES
  )
    throw new UserError("Pilih gambar JPG, PNG, atau WebP maksimal 2 MB.");
  const image = Buffer.from(await value.arrayBuffer());
  const allowed = {
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
  } as const;
  try {
    const decoder = sharp(image, {
      limitInputPixels: 20_000_000,
      animated: false,
    });
    const metadata = await decoder.metadata();
    if (
      !metadata.format ||
      !(metadata.format in allowed) ||
      (metadata.pages ?? 1) > 1
    )
      throw new Error("Invalid format");
    // Decode fully to reject corrupt images. Preserve the original bytes, especially QR codes.
    await decoder.stats();
    return {
      image,
      mimeType: allowed[metadata.format as keyof typeof allowed],
    };
  } catch {
    throw new UserError(
      "Gambar tidak valid. Gunakan JPG, PNG, atau WebP yang dapat dibuka.",
    );
  }
}
