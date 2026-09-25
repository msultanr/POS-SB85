import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleteCookie: vi.fn(),
  getCookie: vi.fn(),
  findAdmin: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`);
  }),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ delete: mocks.deleteCookie, get: mocks.getCookie }),
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/db", () => ({
  db: () => ({ admin: { findUnique: mocks.findAdmin } }),
}));

describe("admin logout", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes the session cookie before redirecting to login", async () => {
    const { logout } = await import("@/actions/auth");
    await expect(logout()).rejects.toThrow("redirect:/login");
    expect(mocks.deleteCookie).toHaveBeenCalledExactlyOnceWith("teras-session");
    expect(mocks.deleteCookie.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.redirect.mock.invocationCallOrder[0],
    );
    expect(mocks.findAdmin).not.toHaveBeenCalled();
  });

  it("blocks protected pages once the session cookie is absent", async () => {
    mocks.getCookie.mockReturnValue(undefined);
    const { requireSession } = await import("@/lib/auth");
    await expect(requireSession()).rejects.toThrow("redirect:/login");
    expect(mocks.findAdmin).not.toHaveBeenCalled();
  });
});
