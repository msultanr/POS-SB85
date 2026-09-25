import { describe, expect, it } from "vitest";
import {
  calculateSale,
  checkoutSchema,
  menuSchema,
  MAX_MONEY,
  customerSchema,
} from "@/lib/validation";
describe("checkout validation", () => {
  const line = { productId: "p1", quantity: 2, expectedPrice: 25000 };
  const valid = {
    idempotencyKey: "123e4567-e89b-42d3-a456-426614174000",
    paid: 50000,
    items: [line],
  };
  it("rejects empty, duplicate, fractional, negative and excessive quantities", () => {
    expect(checkoutSchema.safeParse(valid).success).toBe(true);
    for (const items of [
      [],
      [line, line],
      [{ ...line, quantity: 1.5 }],
      [{ ...line, quantity: -1 }],
      [{ ...line, quantity: 100 }],
    ])
      expect(checkoutSchema.safeParse({ ...valid, items }).success).toBe(false);
  });
  it("rejects malformed keys and invalid payment amounts", () => {
    expect(
      checkoutSchema.safeParse({ ...valid, idempotencyKey: "bad" }).success,
    ).toBe(false);
    for (const paid of [NaN, -1, 10.5, MAX_MONEY + 1])
      expect(checkoutSchema.safeParse({ ...valid, paid }).success).toBe(false);
  });
  it("calculates exact change and rejects underpayment/overflow", () => {
    expect(calculateSale([{ price: 25000, quantity: 2 }], 100000)).toEqual({
      total: 50000,
      paid: 100000,
      change: 50000,
    });
    expect(() => calculateSale([{ price: 25000, quantity: 2 }], 49999)).toThrow(
      "belum cukup",
    );
    expect(() =>
      calculateSale([{ price: MAX_MONEY, quantity: 2 }], MAX_MONEY),
    ).toThrow("di luar batas");
  });
});
describe("customer fulfillment", () => {
  const valid = {
    customerName: "Pemesan",
    whatsapp: "0812-3456-7890",
    fulfillment: "PICKUP",
    deliveryAddress: "",
    scheduledAt: "2027-01-02T15:30:00+07:00",
  };
  it("normalizes WhatsApp and permits pickup without an address", () => {
    expect(customerSchema.parse(valid).whatsapp).toBe("6281234567890");
    expect(
      customerSchema.parse({ ...valid, whatsapp: "+62 812 3456 7890" })
        .whatsapp,
    ).toBe("6281234567890");
  });
  it("requires delivery address, valid WhatsApp, and timezone-aware schedule", () => {
    for (const overrides of [
      { fulfillment: "DELIVERY" },
      { whatsapp: "" },
      { whatsapp: "abc1234567890" },
      { scheduledAt: "2027-01-02T15:30" },
      { scheduledAt: "2027-02-30T15:30:00+07:00" },
    ])
      expect(customerSchema.safeParse({ ...valid, ...overrides }).success).toBe(
        false,
      );
    expect(
      customerSchema.safeParse({
        ...valid,
        fulfillment: "DELIVERY",
        deliveryAddress: "Jalan Teras nomor 85, Jakarta",
      }).success,
    ).toBe(true);
  });
});
describe("menu validation", () => {
  const valid = {
    name: "Kopi",
    categoryId: "c1",
    price: 20000,
    imageUrl: "",
    isAvailable: true,
  };
  it("allows empty images but rejects non-HTTPS URLs and invalid prices", () => {
    expect(menuSchema.safeParse(valid).success).toBe(true);
    for (const imageUrl of [
      "javascript:alert(1)",
      "http://example.com/image.png",
      "not-a-url",
    ])
      expect(menuSchema.safeParse({ ...valid, imageUrl }).success).toBe(false);
    for (const price of [-1, 0, 1.5, 10000001])
      expect(menuSchema.safeParse({ ...valid, price }).success).toBe(false);
  });
});
