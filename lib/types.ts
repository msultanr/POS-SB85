export type ProductView = {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  isAvailable: boolean;
  categoryId: string;
};
export type CategoryView = { id: string; name: string };
export type ActionResult<T = undefined> =
  { success: true; data: T } | { success: false; error: string };
export type Receipt = {
  id: string;
  code: string;
  number: number;
  total: number;
  paid: number;
  change: number;
  paymentMethod: "CASH" | "QRIS";
  paymentStatus: "UNPAID" | "REVIEW" | "PAID" | "REJECTED" | "EXPIRED";
  paymentExpiresAt: string | null;
};
