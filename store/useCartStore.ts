"use client";
import { create } from "zustand";
import type { ProductView } from "@/lib/types";
export type CartItem = Pick<ProductView, "id" | "name" | "price"> & {
  quantity: number;
};
type CartState = {
  items: CartItem[];
  paid: string;
  idempotencyKey: string | null;
  addItem: (product: ProductView) => void;
  changeQuantity: (id: string, delta: number) => void;
  removeItem: (id: string) => void;
  setPaid: (value: string) => void;
  checkoutKey: () => string;
  resetCheckoutKey: () => void;
  clear: () => void;
};
// Intentionally scoped to this browser tab; no customer/order data in localStorage.
const createCartStore = () =>
  create<CartState>((set, get) => ({
    items: [],
    paid: "",
    idempotencyKey: null,
    addItem: (product) =>
      set((state) => {
        if (!product.isAvailable) return state;
        const existing = state.items.find((i) => i.id === product.id);
        if (existing && existing.quantity >= 99) return state;
        if (!existing && state.items.length >= 100) return state;
        return {
          items: existing
            ? state.items.map((i) =>
                i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i,
              )
            : [
                ...state.items,
                {
                  id: product.id,
                  name: product.name,
                  price: product.price,
                  quantity: 1,
                },
              ],
          idempotencyKey: null,
        };
      }),
    changeQuantity: (id, delta) =>
      set((state) => ({
        items: state.items
          .map((i) =>
            i.id === id
              ? {
                  ...i,
                  quantity: Math.min(
                    99,
                    Math.max(0, i.quantity + Math.trunc(delta)),
                  ),
                }
              : i,
          )
          .filter((i) => i.quantity > 0),
        idempotencyKey: null,
      })),
    removeItem: (id) =>
      set((state) => ({
        items: state.items.filter((i) => i.id !== id),
        idempotencyKey: null,
      })),
    setPaid: (paid) =>
      set((state) => ({
        paid,
        idempotencyKey: state.paid === paid ? state.idempotencyKey : null,
      })),
    checkoutKey: () => {
      const key = get().idempotencyKey ?? crypto.randomUUID();
      set({ idempotencyKey: key });
      return key;
    },
    clear: () => set({ items: [], paid: "", idempotencyKey: null }),
    resetCheckoutKey: () => set({ idempotencyKey: null }),
  }));
export const useCartStore = createCartStore();
export const useCustomerCartStore = createCartStore();
export const cartTotal = (items: CartItem[]) =>
  items.reduce((sum, item) => sum + item.price * item.quantity, 0);
