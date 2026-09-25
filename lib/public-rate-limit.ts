import "server-only";
import { headers } from "next/headers";
import { createHmac } from "node:crypto";
import { db } from "@/lib/db";
import { UserError } from "@/lib/validation";

// Atomic shared MySQL counter: the upsert locks the row until the read commits.
export async function limitPublicRequest(
  action: "checkout" | "upload" | "tracking",
  scope = "",
) {
  const h = await headers();
  const ip = (h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local").slice(
    0,
    128,
  );
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("SESSION_SECRET belum dikonfigurasi.");
  const key = `${action}:${createHmac("sha256", secret).update(`${ip}:${scope}`).digest("hex")}`;
  const now = new Date();
  const resetAt = new Date(now.getTime() + 10 * 60 * 1000);
  const limit = await db().$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO \`PublicRateLimit\` (\`key\`, attempts, resetAt) VALUES (${key}, 1, ${resetAt})
      ON DUPLICATE KEY UPDATE
        attempts = CASE WHEN resetAt <= ${now} THEN 1 ELSE attempts + 1 END,
        resetAt = CASE WHEN resetAt <= ${now} THEN ${resetAt} ELSE resetAt END`;
    return tx.publicRateLimit.findUniqueOrThrow({ where: { key } });
  });
  if (
    limit.attempts >
    (action === "tracking" ? 120 : action === "checkout" ? 30 : 10)
  )
    throw new UserError(
      "Terlalu banyak percobaan. Tunggu beberapa menit lalu coba kembali.",
    );
}
