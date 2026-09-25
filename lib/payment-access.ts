import "server-only";
import { createHash, createHmac } from "node:crypto";
import { db } from "@/lib/db";
import { expireUnpaidOrders } from "@/lib/payment-expiry";

export function paymentToken(idempotencyKey: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("SESSION_SECRET belum dikonfigurasi.");
  return createHmac("sha256", secret)
    .update(`self-order:${idempotencyKey}`)
    .digest("hex");
}
export function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
export async function findCustomerOrder(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  await expireUnpaidOrders();
  return db().order.findUnique({
    where: { accessTokenHash: tokenHash(token) },
    include: { items: true, proof: { select: { version: true } } },
  });
}
