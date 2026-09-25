import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@/generated/prisma/client";
const mock = vi.hoisted(() => ({ upsert: vi.fn(), readImage: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  requireSession: vi.fn(async () => ({ id: "admin" })),
}));
vi.mock("@/lib/db", () => ({
  db: () => ({ setting: { upsert: mock.upsert } }),
}));
vi.mock("@/lib/upload", () => ({ readUploadedImage: mock.readImage }));
describe("shared settings storage", () => {
  const image = { image: new Uint8Array([1, 2, 3]), mimeType: "image/png" };
  beforeEach(() => {
    vi.clearAllMocks();
    mock.upsert.mockResolvedValue({});
    mock.readImage.mockResolvedValue(image);
  });
  it("updates only the logo setting", async () => {
    const { saveLogoImage } = await import("@/actions/branding");
    expect((await saveLogoImage(new FormData())).success).toBe(true);
    expect(mock.upsert).toHaveBeenCalledExactlyOnceWith({
      where: { id: "logo" },
      create: { id: "logo", ...image },
      update: image,
    });
  });
  it("updates only the QRIS setting", async () => {
    const { saveQrisImage } = await import("@/actions/payment");
    expect((await saveQrisImage(new FormData())).success).toBe(true);
    expect(mock.upsert).toHaveBeenCalledExactlyOnceWith({
      where: { id: "qris" },
      create: { id: "qris", ...image },
      update: image,
    });
  });
  it("normal seed preserves admin replacements in both rows", async () => {
    const { seedStoreAssets } = await import("@/prisma/store-assets");
    const prisma = {
      setting: { upsert: mock.upsert },
      $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
    } as unknown as PrismaClient;
    await seedStoreAssets(prisma);
    expect(mock.upsert).toHaveBeenCalledTimes(2);
    for (const id of ["logo", "qris"])
      expect(mock.upsert).toHaveBeenCalledWith({
        where: { id },
        create: expect.objectContaining({ id, image: expect.any(Uint8Array) }),
        update: {},
      });
  });
  it("still requires admin to change settings", async () => {
    const { requireSession } = await import("@/lib/auth");
    vi.mocked(requireSession).mockRejectedValueOnce(
      new Error("Unauthenticated"),
    );
    const { saveLogoImage } = await import("@/actions/branding");
    await expect(saveLogoImage(new FormData())).rejects.toThrow(
      "Unauthenticated",
    );
    expect(mock.upsert).not.toHaveBeenCalled();
  });
});
