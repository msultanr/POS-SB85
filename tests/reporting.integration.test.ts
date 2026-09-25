import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { generateOrderCode } from "@/lib/generate-order-code";
import { reportPeriod } from "@/lib/report-period";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth", () => ({
  requireSession: vi.fn(async () => ({
    id: "report-test-admin",
    username: "administrator",
  })),
}));

describe.skipIf(!process.env.TEST_DATABASE_URL)("reporting aggregates", () => {
  let db: ReturnType<typeof import("@/lib/db").db>;
  let getReport: typeof import("@/lib/reporting").getReport;
  let categoryId: string;
  let soldId: string;
  let zeroId: string;
  const keys: string[] = [];
  beforeAll(async () => {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    db = (await import("@/lib/db")).db();
    ({ getReport } = await import("@/lib/reporting"));
    categoryId = (
      await db.category.create({
        data: { name: `report-test-${randomUUID()}` },
      })
    ).id;
    soldId = (
      await db.product.create({
        data: { name: "Report sold", categoryId, price: 99000 },
      })
    ).id;
    zeroId = (
      await db.product.create({
        data: { name: "Report zero", categoryId, price: 10000 },
      })
    ).id;
    for (const [createdAt, quantity, paymentStatus] of [
      ["2001-02-02T16:59:59.999Z", 9, "PAID"], // Before WIB start.
      ["2001-02-02T17:00:00.000Z", 2, "PAID"],
      ["2001-02-03T17:00:00.000Z", 3, "PAID"],
      ["2001-02-04T16:59:59.999Z", 1, "UNPAID"],
      ["2001-02-04T17:00:00.000Z", 8, "PAID"], // After inclusive end.
    ] as const) {
      const key = randomUUID();
      keys.push(key);
      await db.order.create({
        data: {
          idempotencyKey: key,
          code: generateOrderCode(),
          requestHash: "0".repeat(64),
          createdAt: new Date(createdAt),
          paymentMethod: "QRIS",
          paymentStatus,
          total: quantity * 10000,
          paid: paymentStatus === "PAID" ? quantity * 10000 : 0,
          change: 0,
          items: {
            create: {
              productId: soldId,
              productName: "Historical name",
              unitPrice: 10000,
              quantity,
              subtotal: quantity * 10000,
            },
          },
        },
      });
    }
    await db.product.update({
      where: { id: soldId },
      data: { deletedAt: new Date() },
    });
  });
  afterAll(async () => {
    if (!db) return;
    await db.order.deleteMany({ where: { idempotencyKey: { in: keys } } });
    if (categoryId) {
      await db.product.deleteMany({ where: { categoryId } });
      await db.category.delete({ where: { id: categoryId } });
    }
    await db.$disconnect();
  });
  it("excludes unpaid sales, uses historical prices, and includes archived sold and zero-sale menus", async () => {
    const report = await getReport(reportPeriod("2001-02-03", "2001-02-04"));
    expect(report.summary).toMatchObject({
      orders: 3,
      paidOrders: 2,
      revenue: 50000,
      items: 5,
      average: 25000,
      pendingPayment: 0,
      expired: 1,
    });
    expect(report.trend).toEqual([
      { date: "2001-02-03", revenue: 20000, orders: 1, paidOrders: 1 },
      { date: "2001-02-04", revenue: 30000, orders: 2, paidOrders: 1 },
    ]);
    expect(report.products.find((p) => p.id === soldId)).toMatchObject({
      archived: true,
      quantity: 5,
      revenue: 50000,
      orders: 2,
    });
    expect(report.products.find((p) => p.id === zeroId)).toMatchObject({
      quantity: 0,
      revenue: 0,
      orders: 0,
    });
    expect(report.segments.reduce((n, s) => n + s.revenue, 0)).toBe(50000);
  });
  it("fills empty days and avoids dividing by zero", async () => {
    const report = await getReport(reportPeriod("2001-01-01", "2001-01-02"));
    expect(report.summary).toMatchObject({
      orders: 0,
      revenue: 0,
      average: 0,
      items: 0,
    });
    expect(report.trend).toEqual([
      { date: "2001-01-01", revenue: 0, orders: 0, paidOrders: 0 },
      { date: "2001-01-02", revenue: 0, orders: 0, paidOrders: 0 },
    ]);
    expect(report.products.some((p) => p.id === soldId)).toBe(false);
  });
  it("requires admin before fetching report data", async () => {
    const { requireSession } = await import("@/lib/auth");
    vi.mocked(requireSession).mockRejectedValueOnce(
      new Error("Unauthenticated"),
    );
    await expect(
      getReport(reportPeriod("2001-02-03", "2001-02-04")),
    ).rejects.toThrow("Unauthenticated");
  });
});
