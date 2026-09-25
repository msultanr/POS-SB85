import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  requireSession: vi.fn(async () => ({
    id: "test-admin",
    username: "administrator",
  })),
}));

// This suite only touches its own fixtures in an explicitly selected test database.
describe.skipIf(!process.env.TEST_DATABASE_URL)(
  "MySQL transaction integration",
  () => {
    let database: ReturnType<typeof import("@/lib/db").db>;
    let processTransaction: typeof import("@/actions/transaction").processTransaction;
    let advanceOrder: typeof import("@/actions/transaction").advanceOrder;
    let saveProduct: typeof import("@/actions/menu").saveProduct;
    let deleteProduct: typeof import("@/actions/menu").deleteProduct;
    let categoryId: string;
    let productId: string;
    const keys: string[] = [];
    const input = (paid = 100000) => {
      const idempotencyKey = randomUUID();
      keys.push(idempotencyKey);
      return {
        idempotencyKey,
        paid,
        items: [{ productId, quantity: 2, expectedPrice: 25000 }],
      };
    };
    beforeAll(async () => {
      process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
      database = (await import("@/lib/db")).db();
      ({ processTransaction, advanceOrder } =
        await import("@/actions/transaction"));
      ({ saveProduct, deleteProduct } = await import("@/actions/menu"));
      const category = await database.category.create({
        data: { name: `test-${randomUUID()}` },
      });
      categoryId = category.id;
      productId = (
        await database.product.create({
          data: { name: "Test nasi", categoryId, price: 25000 },
        })
      ).id;
    });
    afterAll(async () => {
      if (!database) return;
      await database.order.deleteMany({
        where: { idempotencyKey: { in: keys } },
      });
      if (categoryId) {
        await database.product.deleteMany({ where: { categoryId } });
        await database.category.delete({ where: { id: categoryId } });
      }
      await database.$disconnect();
    });
    it("creates a paid order and handles sequential/concurrent retries exactly once", async () => {
      const request = input();
      const [a, b] = await Promise.all([
        processTransaction(request),
        processTransaction(request),
      ]);
      expect(a.success).toBe(true);
      expect(b).toEqual(a);
      expect(await processTransaction(request)).toEqual(a);
      expect(
        await database.order.count({
          where: { idempotencyKey: request.idempotencyKey },
        }),
      ).toBe(1);
      const order = await database.order.findUniqueOrThrow({
        where: { idempotencyKey: request.idempotencyKey },
        include: { items: true },
      });
      expect(order).toMatchObject({
        total: 50000,
        paid: 100000,
        change: 50000,
        status: "PENDING",
      });
      expect(order.items[0]).toMatchObject({
        productName: "Test nasi",
        unitPrice: 25000,
        quantity: 2,
        subtotal: 50000,
      });
      expect(
        (await processTransaction({ ...request, paid: 50000 })).success,
      ).toBe(false);
      expect((await advanceOrder(order.id, "PENDING")).success).toBe(true);
      expect((await advanceOrder(order.id, "PENDING")).success).toBe(false);
      expect(
        (await database.order.findUniqueOrThrow({ where: { id: order.id } }))
          .status,
      ).toBe("PROCESSING");
      expect((await advanceOrder(order.id, "PROCESSING")).success).toBe(true);
    });
    it("rolls back underpayment, stale price, and unavailable products", async () => {
      const underpaid = input(49999);
      expect((await processTransaction(underpaid)).success).toBe(false);
      expect(
        await database.order.count({
          where: { idempotencyKey: underpaid.idempotencyKey },
        }),
      ).toBe(0);
      const stale = input();
      stale.items[0].expectedPrice = 1;
      expect((await processTransaction(stale)).success).toBe(false);
      await database.product.update({
        where: { id: productId },
        data: { isAvailable: false },
      });
      expect((await processTransaction(input())).success).toBe(false);
      await database.product.update({
        where: { id: productId },
        data: { isAvailable: true },
      });
    });
    it("creates/edits menus and retains receipt snapshots after product deletion", async () => {
      expect(
        (
          await saveProduct(null, {
            name: "Test teh",
            categoryId,
            price: 8000,
            imageUrl: "",
            isAvailable: true,
          })
        ).success,
      ).toBe(true);
      const request = input();
      expect((await processTransaction(request)).success).toBe(true);
      expect(
        (
          await saveProduct(productId, {
            name: "Harga baru",
            categoryId,
            price: 30000,
            imageUrl: "",
            isAvailable: true,
          })
        ).success,
      ).toBe(true);
      expect((await deleteProduct(productId)).success).toBe(true);
      const order = await database.order.findUniqueOrThrow({
        where: { idempotencyKey: request.idempotencyKey },
        include: { items: true },
      });
      expect(order.items[0]).toMatchObject({
        productName: "Test nasi",
        unitPrice: 25000,
      });
      expect((await processTransaction(input())).success).toBe(false);
      expect((await processTransaction(request)).success).toBe(true);
    });
  },
);
