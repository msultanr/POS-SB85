export const PAYMENT_WINDOW_MS = 10 * 60 * 1000;

export function paymentDeadline(createdAt: Date | string) {
  return new Date(new Date(createdAt).getTime() + PAYMENT_WINDOW_MS);
}

export function paymentCutoff(now = new Date()) {
  return new Date(now.getTime() - PAYMENT_WINDOW_MS);
}
