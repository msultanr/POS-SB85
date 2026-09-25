import { beforeEach, describe, expect, it } from "vitest";
import { cartTotal, useCartStore } from "@/store/useCartStore";
const product = {
  id: "p1",
  name: "Kopi",
  price: 20000,
  isAvailable: true,
  imageUrl: null,
  categoryId: "c1",
};
beforeEach(() => useCartStore.getState().clear());
describe("cart", () => {
  it("combines repeated taps and computes rupiah without floating point", () => {
    useCartStore.getState().addItem(product);
    useCartStore.getState().addItem(product);
    expect(useCartStore.getState().items).toHaveLength(1);
    expect(cartTotal(useCartStore.getState().items)).toBe(40000);
    useCartStore.getState().changeQuantity("p1", -1);
    expect(cartTotal(useCartStore.getState().items)).toBe(20000);
    useCartStore.getState().changeQuantity("p1", -1);
    expect(useCartStore.getState().items).toHaveLength(0);
  });
  it("does not add sold-out items and caps quantity", () => {
    useCartStore.getState().addItem({ ...product, isAvailable: false });
    expect(useCartStore.getState().items).toHaveLength(0);
    for (let i = 0; i < 105; i++) useCartStore.getState().addItem(product);
    expect(useCartStore.getState().items[0].quantity).toBe(99);
  });
  it("reuses checkout key until contents or payment change", () => {
    useCartStore.getState().addItem(product);
    const key = useCartStore.getState().checkoutKey();
    expect(useCartStore.getState().checkoutKey()).toBe(key);
    useCartStore.getState().setPaid("20000");
    expect(useCartStore.getState().checkoutKey()).not.toBe(key);
    const nextKey = useCartStore.getState().checkoutKey();
    useCartStore.getState().setPaid("20000");
    expect(useCartStore.getState().checkoutKey()).toBe(nextKey);
    useCartStore.getState().changeQuantity("p1", 1);
    expect(useCartStore.getState().checkoutKey()).not.toBe(nextKey);
  });
});
