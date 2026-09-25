import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createHmac, randomUUID } from "node:crypto";
import sharp from "sharp";
vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/headers", () => ({
  headers: vi.fn(
    async () => new Headers({ "x-forwarded-for": "qris-integration-test" }),
  ),
}));
vi.mock("@/lib/auth", () => ({
  requireSession: vi.fn(async () => ({
    id: "test-admin",
    username: "administrator",
  })),
  session: vi.fn(async () => null),
}));

describe.skipIf(!process.env.TEST_DATABASE_URL)(
  "QRIS and public checkout",
  () => {
    let db: ReturnType<typeof import("@/lib/db").db>;
    let checkout: typeof import("@/actions/self-order").checkoutSelfOrder;
    let upload: typeof import("@/actions/self-order").uploadPaymentProof;
    let review: typeof import("@/actions/payment").reviewPayment;
    let processTransaction: typeof import("@/actions/transaction").processTransaction;
    let advance: typeof import("@/actions/transaction").advanceOrder;
    let categoryId: string;
    let productId: string;
    let image: Buffer;
    let originalQris: Awaited<
      ReturnType<
        ReturnType<typeof import("@/lib/db").db>["setting"]["findUnique"]
      >
    >;
    const keys: string[] = [];
    const limitScopes: string[] = [""];
    function request() {
      const idempotencyKey = randomUUID();
      keys.push(idempotencyKey);
      return {
        idempotencyKey,
        customerName: "Pelanggan Tes",
        whatsapp: "6281234567890",
        fulfillment: "PICKUP" as const,
        deliveryAddress: "",
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        items: [{ productId, quantity: 2, expectedPrice: 18000 }],
      };
    }
    function proofForm(buffer = image, type = "image/png") {
      const form = new FormData();
      form.set(
        "proof",
        new File([new Uint8Array(buffer)], "proof.png", { type }),
      );
      return form;
    }
    beforeAll(async () => {
      process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
      process.env.SESSION_SECRET = "qris-integration-test-secret-long-enough";
      db = (await import("@/lib/db")).db();
      ({ checkoutSelfOrder: checkout, uploadPaymentProof: upload } =
        await import("@/actions/self-order"));
      ({ reviewPayment: review } = await import("@/actions/payment"));
      ({ processTransaction, advanceOrder: advance } =
        await import("@/actions/transaction"));
      originalQris = await db.setting.findUnique({
        where: { id: "qris" },
      });
      // Synthetic image only in the isolated test database. Never a payment QR.
      image = await sharp({
        create: { width: 80, height: 80, channels: 3, background: "#ffffff" },
      })
        .png()
        .toBuffer();
      const data = { image: new Uint8Array(image), mimeType: "image/png" };
      await db.setting.upsert({
        where: { id: "qris" },
        create: { id: "qris", ...data },
        update: data,
      });
      categoryId = (
        await db.category.create({
          data: { name: `qris-test-${randomUUID()}` },
        })
      ).id;
      productId = (
        await db.product.create({
          data: { name: "Kopi QRIS tes", price: 18000, categoryId },
        })
      ).id;
    });
    afterAll(async () => {
      if (!db) return;
      await db.order.deleteMany({ where: { idempotencyKey: { in: keys } } });
      if (categoryId) {
        await db.product.deleteMany({ where: { categoryId } });
        await db.category.delete({ where: { id: categoryId } });
      }
      if (originalQris)
        await db.setting.update({
          where: { id: "qris" },
          data: { image: originalQris.image, mimeType: originalQris.mimeType },
        });
      else await db.setting.deleteMany({ where: { id: "qris" } });
      await db.publicRateLimit.deleteMany({
        where: {
          key: {
            in: limitScopes.flatMap((scope) =>
              ["checkout", "upload", "tracking"].map(
                (action) =>
                  `${action}:${createHmac("sha256", process.env.SESSION_SECRET!).update(`qris-integration-test:${scope}`).digest("hex")}`,
              ),
            ),
          },
        },
      });
      await db.$disconnect();
    });
    it("creates one unpaid customer order on concurrent retries and protects its link", async () => {
      const input = request();
      const [a, b] = await Promise.all([checkout(input), checkout(input)]);
      expect(a.success).toBe(true);
      expect(b).toEqual(a);
      if (!a.success) throw new Error(a.error);
      expect(a.data).toMatchObject({
        total: 36000,
        paid: 0,
        change: 0,
        paymentMethod: "QRIS",
        paymentStatus: "UNPAID",
      });
      const { findCustomerOrder } = await import("@/lib/payment-access");
      expect((await findCustomerOrder(a.data.accessToken!))?.customerName).toBe(
        "Pelanggan Tes",
      );
      expect(await findCustomerOrder("a".repeat(64))).toBeNull();
      expect((await upload("a".repeat(64), proofForm())).success).toBe(false);
      expect(
        await db.order.count({
          where: { idempotencyKey: input.idempotencyKey },
        }),
      ).toBe(1);
      expect((await advance(a.data.id, "PENDING")).success).toBe(false);
      expect(
        (await processTransaction({ ...input, paid: 36000 })).success,
      ).toBe(false);
    });
    it("validates uploads, rejects wrong amounts, and requires the latest proof before approval", async () => {
      const result = await checkout(request());
      if (!result.success) throw new Error(result.error);
      const { id, accessToken: token } = result.data;
      limitScopes.push(id);
      expect(
        (
          await upload(
            token!,
            proofForm(Buffer.from("<svg></svg>"), "image/png"),
          )
        ).success,
      ).toBe(false);
      expect(
        (await upload(token!, proofForm(Buffer.alloc(2 * 1024 * 1024 + 1))))
          .success,
      ).toBe(false);
      expect((await upload(token!, proofForm())).success).toBe(true);
      const first = await db.paymentProof.findUniqueOrThrow({
        where: { orderId: id },
      });
      expect((await upload(token!, proofForm())).success).toBe(false);
      expect(
        (await db.order.findUniqueOrThrow({ where: { id } })).paymentStatus,
      ).toBe("REVIEW");
      expect((await advance(id, "PENDING")).success).toBe(false);
      const approval = {
        id,
        expectedStatus: "REVIEW" as const,
        proofVersion: first.version,
        receivedAmount: 36000,
        decision: "APPROVE" as const,
        note: "",
      };
      expect(
        (await review({ ...approval, receivedAmount: 35000 })).success,
      ).toBe(false);
      expect(
        (
          await review({
            ...approval,
            decision: "REJECT",
            note: "Nominal tidak sesuai",
          })
        ).success,
      ).toBe(true);
      expect((await upload(token!, proofForm())).success).toBe(true);
      const second = await db.paymentProof.findUniqueOrThrow({
        where: { orderId: id },
      });
      expect(second.version).not.toBe(first.version);
      expect((await review(approval)).success).toBe(false);
      expect(
        (await review({ ...approval, proofVersion: second.version })).success,
      ).toBe(true);
      expect(await db.order.findUniqueOrThrow({ where: { id } })).toMatchObject(
        {
          paymentStatus: "PAID",
          paid: 36000,
          change: 0,
          verifiedBy: "administrator",
        },
      );
      expect((await upload(token!, proofForm())).success).toBe(false);
      expect((await advance(id, "PENDING")).success).toBe(true);
    });
    it("allows admin to confirm cashier QRIS only after matching the received amount", async () => {
      const result = await processTransaction({
        ...request(),
        paymentMethod: "QRIS",
        paid: 999999,
      });
      if (!result.success) throw new Error(result.error);
      expect(result.data.paid).toBe(0);
      expect(result.data.paymentStatus).toBe("UNPAID");
      expect(
        (
          await review({
            id: result.data.id,
            expectedStatus: "UNPAID",
            proofVersion: null,
            decision: "APPROVE",
            receivedAmount: 36000,
            note: "",
          })
        ).success,
      ).toBe(true);
      expect((await advance(result.data.id, "PENDING")).success).toBe(true);
    });
    it("does not expose evidence or approve payments without admin authentication", async () => {
      const { GET } = await import("@/app/api/payment-proofs/[id]/route");
      expect(
        (
          await GET(
            new Request("http://localhost/api/payment-proofs/unknown"),
            { params: Promise.resolve({ id: "unknown" }) },
          )
        ).status,
      ).toBe(401);
      const { requireSession } = await import("@/lib/auth");
      vi.mocked(requireSession).mockRejectedValueOnce(
        new Error("Unauthenticated"),
      );
      await expect(
        review({
          id: "unknown",
          expectedStatus: "UNPAID",
          proofVersion: null,
          decision: "APPROVE",
          receivedAmount: 1,
          note: "",
        }),
      ).rejects.toThrow("Unauthenticated");
    });
    it("validates delivery details, protects tracking privacy, and restricts courier updates", async () => {
      const { saveCourierLink, trackDelivery } =
        await import("@/actions/delivery");
      const input = {
        ...request(),
        fulfillment: "DELIVERY" as const,
        deliveryAddress: "Jalan Tes 85, Jakarta Selatan",
      };
      expect((await checkout({ ...input, whatsapp: "invalid" })).success).toBe(
        false,
      );
      expect((await checkout({ ...input, deliveryAddress: "" })).success).toBe(
        false,
      );
      expect(
        (
          await checkout({
            ...input,
            scheduledAt: new Date(Date.now() - 86400000).toISOString(),
          })
        ).success,
      ).toBe(false);
      expect(
        (
          await checkout({
            ...input,
            scheduledAt: new Date(Date.now() + 31 * 86400000).toISOString(),
          })
        ).success,
      ).toBe(false);
      const result = await checkout(input);
      if (!result.success) throw new Error(result.error);
      const { id, accessToken } = result.data;
      limitScopes.push(id);
      expect(
        (await saveCourierLink(id, "https://example.com/trip")).success,
      ).toBe(false);
      expect((await upload(accessToken!, proofForm())).success).toBe(true);
      const proof = await db.paymentProof.findUniqueOrThrow({
        where: { orderId: id },
      });
      expect(
        (
          await review({
            id,
            expectedStatus: "REVIEW",
            proofVersion: proof.version,
            receivedAmount: 36000,
            decision: "APPROVE",
            note: "",
          })
        ).success,
      ).toBe(true);
      expect(
        (await saveCourierLink(id, "https://example.com/trip")).success,
      ).toBe(false);
      expect((await advance(id, "PENDING")).success).toBe(true);
      expect((await saveCourierLink(id, "javascript:alert(1)")).success).toBe(
        false,
      );
      expect(
        (await saveCourierLink(id, "http://example.com/trip")).success,
      ).toBe(false);
      expect(
        (await saveCourierLink(id, "https://example.com/trip")).success,
      ).toBe(true);
      const code = result.data.code;
      expect(code).toMatch(/^SB85-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/);
      const tracked = await trackDelivery(code.toLowerCase());
      expect(tracked).toMatchObject({
        success: true,
        data: {
          code,
          status: "PROCESSING",
          paymentStatus: "PAID",
          courierUrl: "https://example.com/trip",
        },
      });
      if (tracked.success)
        expect(Object.keys(tracked.data).sort()).toEqual([
          "code",
          "courierUrl",
          "paymentStatus",
          "scheduledAt",
          "status",
        ]);
      expect((await trackDelivery("not-found")).success).toBe(false);
      const pickup = await checkout(request());
      if (!pickup.success) throw new Error(pickup.error);
      expect((await trackDelivery(pickup.data.code)).success).toBe(false);
      expect((await trackDelivery(id)).success).toBe(false);
      expect(await trackDelivery(code.slice(5))).toEqual(tracked);
      const { requireSession } = await import("@/lib/auth");
      vi.mocked(requireSession).mockRejectedValueOnce(
        new Error("Unauthenticated"),
      );
      await expect(
        saveCourierLink(id, "https://example.com/trip"),
      ).rejects.toThrow("Unauthenticated");
      expect((await advance(id, "PROCESSING")).success).toBe(true);
      expect(
        (await saveCourierLink(id, "https://example.com/updated-trip")).success,
      ).toBe(true);
    });
    it("creates one notification per admin on self checkout and isolates read receipts", async () => {
      const { getOrderNotifications, markNotificationsRead } =
        await import("@/actions/notifications");
      const { requireSession } = await import("@/lib/auth");
      const admins = await Promise.all(
        [0, 1].map(() =>
          db.admin.create({
            data: {
              username: `notify-test-${randomUUID()}`,
              passwordHash: "test-only-unused-hash",
            },
          }),
        ),
      );
      try {
        const input = request();
        const first = await checkout(input);
        expect(first.success).toBe(true);
        expect(await checkout(input)).toEqual(first);
        if (!first.success) throw new Error(first.error);
        for (const admin of admins)
          expect(
            await db.orderNotification.count({
              where: { adminId: admin.id, orderId: first.data.id },
            }),
          ).toBe(1);
        vi.mocked(requireSession).mockResolvedValueOnce(admins[0]);
        const feed = await getOrderNotifications();
        expect(feed.unreadCount).toBe(1);
        expect(feed.items[0].order).toMatchObject({
          id: first.data.id,
          fulfillment: "PICKUP",
          paymentStatus: "UNPAID",
        });
        vi.mocked(requireSession).mockResolvedValueOnce(admins[1]);
        await markNotificationsRead([feed.items[0].id]);
        expect(
          (
            await db.orderNotification.findUniqueOrThrow({
              where: { id: feed.items[0].id },
            })
          ).readAt,
        ).toBeNull();
        vi.mocked(requireSession).mockResolvedValueOnce(admins[0]);
        expect((await markNotificationsRead([feed.items[0].id])).success).toBe(
          true,
        );
        vi.mocked(requireSession).mockResolvedValueOnce(admins[0]);
        const updated = await getOrderNotifications();
        expect(updated.unreadCount).toBe(0);
        expect(updated.items[0].readAt).not.toBeNull();
        vi.mocked(requireSession).mockResolvedValueOnce(admins[1]);
        expect((await getOrderNotifications()).unreadCount).toBe(1);
        vi.mocked(requireSession).mockRejectedValueOnce(
          new Error("Unauthenticated"),
        );
        await expect(getOrderNotifications()).rejects.toThrow(
          "Unauthenticated",
        );
        vi.mocked(requireSession).mockRejectedValueOnce(
          new Error("Unauthenticated"),
        );
        await expect(markNotificationsRead([feed.items[0].id])).rejects.toThrow(
          "Unauthenticated",
        );
      } finally {
        await db.admin.deleteMany({
          where: { id: { in: admins.map((a) => a.id) } },
        });
      }
    });
    it("applies a shared database rate limit and refuses checkout if QRIS is unconfigured", async () => {
      const { limitPublicRequest } = await import("@/lib/public-rate-limit");
      const scope = randomUUID();
      limitScopes.push(scope);
      const results = await Promise.allSettled(
        Array.from({ length: 31 }, () => limitPublicRequest("checkout", scope)),
      );
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(30);
      expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
      await db.setting.delete({ where: { id: "qris" } });
      expect((await checkout(request())).success).toBe(false);
      await db.setting.create({
        data: {
          id: "qris",
          image: new Uint8Array(image),
          mimeType: "image/png",
        },
      });
    });
  },
);
