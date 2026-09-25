import { expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";
it("salts admin passwords and rejects incorrect or malformed credentials", async () => {
  const hash = await hashPassword("sabang85");
  expect(hash).not.toContain("sabang85");
  expect(await hashPassword("sabang85")).not.toBe(hash);
  expect(await verifyPassword("sabang85", hash)).toBe(true);
  expect(await verifyPassword("wrong-password", hash)).toBe(false);
  expect(await verifyPassword("sabang85", "broken-hash")).toBe(false);
});
