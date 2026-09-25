import { describe, expect, it } from "vitest";
import { reportPeriod } from "@/lib/report-period";
describe("report dates in WIB", () => {
  it("defaults to the current WIB month even across UTC midnight", () => {
    expect(
      reportPeriod(undefined, undefined, new Date("2026-08-31T18:00:00Z")),
    ).toMatchObject({ from: "2026-09-01", to: "2026-09-01", days: 1 });
  });
  it("includes the end date using an exclusive next-midnight boundary", () => {
    const p = reportPeriod("2026-09-22", "2026-09-23");
    expect(p.fromDate.toISOString()).toBe("2026-09-21T17:00:00.000Z");
    expect(p.untilDate.toISOString()).toBe("2026-09-23T17:00:00.000Z");
    expect(p.days).toBe(2);
  });
  it("rejects invalid, reversed, and oversized date ranges", () => {
    for (const [from, to] of [
      ["2026-02-30", "2026-03-01"],
      ["2026-09-23", "2026-09-22"],
      ["2024-01-01", "2026-01-01"],
      ["invalid", "2026-09-22"],
    ])
      expect(() => reportPeriod(from, to)).toThrow();
    expect(reportPeriod("2024-01-01", "2024-12-31").days).toBe(366);
  });
});
