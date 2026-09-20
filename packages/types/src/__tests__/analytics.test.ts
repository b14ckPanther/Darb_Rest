import { describe, it, expect } from "vitest";
import { validAnalyticsRange, csvCell, canViewAnalytics } from "../analytics";
describe("analytics boundaries", () => {
  it("accepts inclusive dates and leap days", () => {
    expect(validAnalyticsRange("2024-02-29", "2025-02-28")).toBe(true);
    expect(validAnalyticsRange("2026-01-01", "2026-01-01")).toBe(true);
  });
  it("rejects invalid dates, reversed and excessive ranges", () => {
    for (const [a, b] of [
      ["2026-02-30", "2026-03-01"],
      ["2026-02-02", "2026-01-01"],
      ["2025-01-01", "2026-02-01"],
      ["invalid", "2026-01-01"],
    ])
      expect(validAnalyticsRange(a!, b!)).toBe(false);
  });
  it("keeps staff and editors out of reports", () => {
    for (const r of ["owner", "admin", "manager", "read_only"] as const)
      expect(canViewAnalytics(r)).toBe(true);
    expect(canViewAnalytics("staff")).toBe(false);
    expect(canViewAnalytics("editor")).toBe(false);
  });
  it("quotes CSV delimiters and neutralizes spreadsheet formulas", () => {
    expect(csvCell('a,"b')).toBe('"a,""b"');
    expect(csvCell("=1+1")).toBe('"\'=1+1"');
    expect(csvCell(32)).toBe('"32"');
  });
});
