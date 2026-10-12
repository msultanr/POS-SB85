import { beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";

const mock = vi.hoisted(() => ({
  setting: vi.fn(),
  upsert: vi.fn(),
  existing: vi.fn(),
  create: vi.fn(),
  products: vi.fn(),
  auth: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireSession: mock.auth }));
vi.mock("@/lib/payment-expiry", () => ({ expireUnpaidOrders: vi.fn() }));
vi.mock("@/lib/payment-access", () => ({
  paymentToken: () => "token",
  tokenHash: () => "hash",
}));
vi.mock("@/lib/db", () => ({
  db: () => {
    const client = {
      setting: { findUnique: mock.setting, upsert: mock.upsert },
      order: { findUnique: mock.existing, create: mock.create },
      product: { findMany: mock.products },
      admin: { findMany: async () => [] },
    };
    return {
      ...client,
      $transaction: async (fn: (tx: unknown) => unknown) => fn(client),
    };
  },
}));

describe("customer ordering availability", () => {
  const input = {
    idempotencyKey: "55ba53e4-4b7a-414e-9b5e-683a73ca22d0",
    paid: 10000,
    items: [{ productId: "product", quantity: 1, expectedPrice: 10000 }],
  };
  beforeEach(() => {
    vi.resetAllMocks();
    mock.auth.mockResolvedValue({ id: "admin" });
    mock.setting.mockResolvedValue({ value: "false" });
    mock.existing.mockResolvedValue(null);
    mock.products.mockResolvedValue([
      { id: "product", name: "Menu", price: 10000 },
    ]);
    mock.create.mockResolvedValue({
      id: "order",
      code: "SB85-ABCDEFGH",
      number: 1,
      total: 10000,
      paid: 10000,
      change: 0,
      paymentMethod: "CASH",
      paymentStatus: "PAID",
      createdAt: new Date(),
    });
  });
  it("defaults to open for existing installations and fails closed for invalid values", async () => {
    const { isSelfOrderOpen } = await import("@/lib/order-availability");
    mock.setting.mockResolvedValueOnce(null);
    expect(await isSelfOrderOpen()).toBe(true);
    expect(await isSelfOrderOpen()).toBe(false);
    mock.setting.mockResolvedValueOnce({ value: "true" });
    expect(await isSelfOrderOpen()).toBe(true);
    mock.setting.mockResolvedValueOnce({ value: "invalid" });
    expect(await isSelfOrderOpen()).toBe(false);
  });
  it("rejects direct checkout while closed without creating an order", async () => {
    const { createOrder } = await import("@/lib/checkout");
    const result = await createOrder(input, "SELF_SERVICE");
    expect(result).toMatchObject({
      success: false,
      error: expect.stringContaining("ditutup"),
    });
    expect(mock.create).not.toHaveBeenCalled();
    expect(mock.products).not.toHaveBeenCalled();
  });
  it("does not block cashier checkout", async () => {
    const { createOrder } = await import("@/lib/checkout");
    expect((await createOrder(input, "CASHIER")).success).toBe(true);
    expect(mock.create).toHaveBeenCalledOnce();
    expect(mock.setting).not.toHaveBeenCalled();
  });
  it("allows new customer checkout after reopening", async () => {
    mock.setting.mockResolvedValue({ value: "true" });
    const { createOrder } = await import("@/lib/checkout");
    expect((await createOrder(input, "SELF_SERVICE")).success).toBe(true);
    expect(mock.create).toHaveBeenCalledOnce();
  });
  it("recovers an existing checkout after closure without duplicating it", async () => {
    const requestHash = createHash("sha256")
      .update(
        JSON.stringify({
          paid: 0,
          items: input.items,
          paymentMethod: "QRIS",
          source: "SELF_SERVICE",
        }),
      )
      .digest("hex");
    mock.existing.mockResolvedValue({
      requestHash,
      accessTokenHash: "hash",
      source: "SELF_SERVICE",
      paymentMethod: "QRIS",
      paymentStatus: "UNPAID",
      createdAt: new Date(),
    });
    const { createOrder } = await import("@/lib/checkout");
    expect((await createOrder(input, "SELF_SERVICE")).success).toBe(true);
    expect(mock.create).not.toHaveBeenCalled();
  });
  it("persists both explicit states without overwriting other settings", async () => {
    const { setSelfOrderOpen } = await import("@/actions/order-settings");
    for (const open of [false, true]) {
      expect((await setSelfOrderOpen(open)).success).toBe(true);
      expect(mock.upsert).toHaveBeenLastCalledWith({
        where: { id: "selfOrderOpen" },
        create: { id: "selfOrderOpen", value: String(open) },
        update: { value: String(open) },
      });
    }
  });
  it("requires authentication and rejects invalid status", async () => {
    const { setSelfOrderOpen } = await import("@/actions/order-settings");
    mock.auth.mockRejectedValueOnce(new Error("Unauthorized"));
    await expect(setSelfOrderOpen(false)).rejects.toThrow("Unauthorized");
    expect(
      (await setSelfOrderOpen("false" as unknown as boolean)).success,
    ).toBe(false);
    expect(mock.upsert).not.toHaveBeenCalled();
  });
});
