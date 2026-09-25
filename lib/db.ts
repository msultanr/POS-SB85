import "server-only";
import { mysqlAdapter } from "@/lib/mysql-adapter";
import { Prisma, PrismaClient } from "@/generated/prisma/client";
import * as enums from "@/generated/prisma/enums";
import { createHash } from "node:crypto";
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaCacheKey?: string;
};
// Constructor identity differs across Next server bundles, even for the same
// generated client. Use stable metadata, not identity, to avoid closing live pools.
const modelSignature = JSON.stringify({
  provider: "mysql-v1",
  version: Prisma.prismaVersion.client,
  enums,
  models: Object.entries(Prisma)
    .filter(([key]) => key === "ModelName" || key.endsWith("ScalarFieldEnum"))
    .sort(([a], [b]) => a.localeCompare(b)),
});
export function db() {
  if (!process.env.DATABASE_URL)
    throw new Error("DATABASE_URL belum dikonfigurasi.");
  const cacheKey = createHash("sha256")
    .update(modelSignature)
    .update(process.env.DATABASE_URL)
    .digest("hex");
  if (globalForPrisma.prisma && globalForPrisma.prismaCacheKey !== cacheKey) {
    const outdated = globalForPrisma.prisma;
    globalForPrisma.prisma = undefined;
    void outdated.$disconnect().catch(() => {
      console.error("Unable to disconnect outdated Prisma client");
    });
  }
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = new PrismaClient({
      adapter: mysqlAdapter(process.env.DATABASE_URL),
      transactionOptions: { maxWait: 15000, timeout: 15000 },
    });
    globalForPrisma.prismaCacheKey = cacheKey;
  }
  return globalForPrisma.prisma;
}
