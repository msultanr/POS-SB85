import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { paymentCutoff, paymentDeadline } from "@/lib/payment-deadline";

const mocks = vi.hoisted(() => ({
  updateMany: vi.fn(),
  findUnique: vi.fn(),
  upsert: vi.fn(),
  readImage: vi.fn(),
  customerOrder: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  requireSession: vi.fn(async () => ({ username: "admin" })),
}));
vi.mock("@/lib/public-rate-limit", () => ({ limitPublicRequest: vi.fn() }));
vi.mock("@/lib/payment-access", () => ({
  findCustomerOrder: mocks.customerOrder,
}));
vi.mock("@/lib/upload", () => ({ readUploadedImage: mocks.readImage }));
vi.mock("@/lib/db", () => ({
  db: () => {
    const tx = {
      order: { updateMany: mocks.updateMany, findUnique: mocks.findUnique },
      paymentProof: { upsert: mocks.upsert },
    };
    return {
      ...tx,
      $transaction: async (fn: (tx: unknown) => unknown) => fn(tx),
    };
  },
}));

describe("10 minute QRIS deadline", () => {
  const now = new Date("2026-09-25T10:10:00.000Z");
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
    vi.resetAllMocks();
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.findUnique.mockResolvedValue({
      total: 10000,
      source: "CASHIER",
      paymentMethod: "QRIS",
    });
  });
  afterEach(() => vi.useRealTimers());
  it("expires exactly at 10 minutes, including across midnight", () => {
    expect(paymentDeadline("2026-09-25T23:55:00Z").toISOString()).toBe(
      "2026-09-26T00:05:00.000Z",
    );
    expect(paymentCutoff(now).toISOString()).toBe("2026-09-25T10:00:00.000Z");
  });
  it("only expires unpaid/rejected QRIS, not paid or pending review", async () => {
    const { expireUnpaidOrders } = await import("@/lib/payment-expiry");
    await expireUnpaidOrders();
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: {
        paymentMethod: "QRIS",
        paymentStatus: { in: ["UNPAID", "REJECTED"] },
        createdAt: { lte: paymentCutoff(now) },
      },
      data: { paymentStatus: "EXPIRED" },
    });
  });
  it("rejects expired uploads before decoding or storing", async () => {
    mocks.customerOrder.mockResolvedValue({
      id: "order",
      source: "SELF_SERVICE",
      paymentMethod: "QRIS",
      paymentStatus: "EXPIRED",
    });
    const { uploadPaymentProof } = await import("@/actions/self-order");
    expect((await uploadPaymentProof("token", new FormData())).success).toBe(
      false,
    );
    expect(mocks.readImage).not.toHaveBeenCalled();
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it("rechecks deadline after decoding and rejects a late upload", async () => {
    mocks.customerOrder.mockResolvedValue({
      id: "order",
      source: "SELF_SERVICE",
      paymentMethod: "QRIS",
      paymentStatus: "UNPAID",
    });
    mocks.readImage.mockImplementation(async () => {
      vi.setSystemTime(new Date(now.getTime() + 5000));
      return { image: new Uint8Array([1]), mimeType: "image/png" };
    });
    mocks.updateMany.mockResolvedValue({ count: 0 });
    const { uploadPaymentProof } = await import("@/actions/self-order");
    expect((await uploadPaymentProof("token", new FormData())).success).toBe(
      false,
    );
    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          createdAt: { gt: new Date("2026-09-25T10:00:05Z") },
        }),
      }),
    );
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it("guards cashier approval with the deadline", async () => {
    const { reviewPayment } = await import("@/actions/payment");
    await reviewPayment({
      id: "order",
      expectedStatus: "UNPAID",
      proofVersion: null,
      decision: "APPROVE",
      receivedAmount: 10000,
      note: "",
    });
    expect(mocks.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          paymentStatus: "UNPAID",
          createdAt: { gt: paymentCutoff(now) },
        }),
      }),
    );
  });
  it("allows review of proof submitted on time after deadline", async () => {
    mocks.findUnique.mockResolvedValue({
      total: 10000,
      source: "SELF_SERVICE",
      paymentMethod: "QRIS",
    });
    const { reviewPayment } = await import("@/actions/payment");
    const result = await reviewPayment({
      id: "order",
      expectedStatus: "REVIEW",
      proofVersion: "3f2ef6cd-5ae1-4c52-a5a0-4e6beb11e123",
      decision: "APPROVE",
      receivedAmount: 10000,
      note: "",
    });
    expect(result.success).toBe(true);
    const where = mocks.updateMany.mock.calls.at(-1)?.[0].where;
    expect(where.paymentStatus).toBe("REVIEW");
    expect(where).not.toHaveProperty("createdAt");
  });
});
