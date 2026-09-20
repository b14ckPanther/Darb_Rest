import { describe, it, expect } from "vitest";
import { tableQrUrl, TABLE_TOKEN_PATTERN, canManageTables } from "../tables";
describe("QR entry contract", () => {
  it("encodes only opaque tokens and supported locales", () => {
    const token = "a".repeat(64);
    expect(tableQrUrl("https://rest.darb.co.il", "ar", token)).toBe(
      `https://rest.darb.co.il/ar/q/${token}`,
    );
    expect(tableQrUrl("http://localhost:3100", "he", token)).toContain("/he/q/");
    expect(TABLE_TOKEN_PATTERN.test("1")).toBe(false);
    expect(() => tableQrUrl("https://rest.darb.co.il", "en", "table-1")).toThrow();
    expect(() => tableQrUrl("https://rest.darb.co.il", "xx", token)).toThrow();
  });
  it("rejects unsafe or malformed public origins", () => {
    for (const origin of [
      "javascript:alert(1)",
      "http://restaurant.example",
      "https://evil@restaurant.example",
      "https://restaurant.example/path",
      "https://restaurant.example?x=1",
    ])
      expect(() => tableQrUrl(origin, "en", "b".repeat(64))).toThrow();
  });
  it("limits management and token access to operational managers", () => {
    for (const role of ["owner", "admin", "manager"] as const)
      expect(canManageTables(role)).toBe(true);
    for (const role of ["editor", "staff", "read_only"] as const)
      expect(canManageTables(role)).toBe(false);
  });
});
