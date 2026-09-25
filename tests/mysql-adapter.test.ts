import { describe, expect, it } from "vitest";
import { mysqlOptions } from "@/lib/mysql-adapter";
import { generateOrderCode } from "@/lib/generate-order-code";
describe("MySQL connection and order codes", () => {
  it("parses escaped credentials and pins database sessions to UTC", () => {
    expect(
      mysqlOptions("mysql://app:p%40ss%3Aword@localhost:3307/POS_test"),
    ).toMatchObject({
      host: "localhost",
      port: 3307,
      user: "app",
      password: "p@ss:word",
      database: "POS_test",
      timezone: "+00:00",
      connectionLimit: 5,
    });
  });
  it("rejects old PostgreSQL URLs and enforces certificate verification when TLS is enabled", () => {
    expect(() => mysqlOptions("postgresql://localhost/old_db")).toThrow(
      "MySQL",
    );
    expect(mysqlOptions("mysql://localhost/test?sslaccept=strict").ssl).toEqual(
      { rejectUnauthorized: true },
    );
  });
  it("generates short cryptographically random codes in the accepted alphabet", () => {
    const codes = Array.from({ length: 1000 }, generateOrderCode);
    expect(new Set(codes).size).toBe(1000);
    for (const code of codes)
      expect(code).toMatch(/^SB85-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{8}$/);
  });
});
