import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  created: vi.fn(),
  disconnect: vi.fn(async () => {}),
  fields: { id: "id" } as Record<string, string>,
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/mysql-adapter", () => ({ mysqlAdapter: () => ({}) }));
vi.mock("@/generated/prisma/client", () => ({
  Prisma: {
    prismaVersion: { client: "test" },
    ModelName: { Order: "Order" },
    OrderScalarFieldEnum: mocks.fields,
  },
  PrismaClient: class {
    constructor() {
      mocks.created();
    }
    $disconnect = mocks.disconnect;
  },
}));

const cache = globalThis as unknown as {
  prisma?: unknown;
  prismaCacheKey?: string;
};
describe("Prisma hot-reload cache", () => {
  beforeEach(() => {
    vi.stubEnv("DATABASE_URL", "mysql://test-only");
    delete cache.prisma;
    delete cache.prismaCacheKey;
    delete mocks.fields.whatsapp;
    vi.clearAllMocks();
    vi.resetModules();
  });
  afterEach(() => {
    delete cache.prisma;
    delete cache.prismaCacheKey;
    vi.unstubAllEnvs();
  });
  it("reuses the connection when unchanged, including ordinary hot reloads", async () => {
    const { db } = await import("@/lib/db");
    const original = db();
    expect(db()).toBe(original);
    vi.resetModules();
    expect((await import("@/lib/db")).db()).toBe(original);
    expect(mocks.created).toHaveBeenCalledTimes(1);
    expect(mocks.disconnect).not.toHaveBeenCalled();
  });
  it("replaces a cached pre-delivery client after regeneration", async () => {
    const original = (await import("@/lib/db")).db();
    mocks.fields.whatsapp = "whatsapp";
    vi.resetModules();
    expect((await import("@/lib/db")).db()).not.toBe(original);
    expect(mocks.disconnect).toHaveBeenCalledTimes(1);
    expect(mocks.created).toHaveBeenCalledTimes(2);
  });
  it("keeps a compatible client even if its constructor differs across bundles", async () => {
    const { db } = await import("@/lib/db");
    db();
    const compatibleOtherBundle = { $disconnect: mocks.disconnect };
    cache.prisma = compatibleOtherBundle;
    expect(db()).toBe(compatibleOtherBundle);
    expect(mocks.disconnect).not.toHaveBeenCalled();
  });
  it("replaces the legacy global client with no cache key", async () => {
    cache.prisma = { $disconnect: mocks.disconnect };
    const previous = cache.prisma;
    expect((await import("@/lib/db")).db()).not.toBe(previous);
    expect(mocks.disconnect).toHaveBeenCalledTimes(1);
  });
});
