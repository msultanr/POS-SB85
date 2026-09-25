import { randomBytes } from "node:crypto";
export function generateOrderCode() {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  return (
    "SB85-" + Array.from(randomBytes(8), (byte) => alphabet[byte % 32]).join("")
  );
}
