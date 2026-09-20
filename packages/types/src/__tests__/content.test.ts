import { it, expect } from "vitest";
import {
  resolveItem,
  startingPrice,
  sortContent,
  localizedContent,
  formatMenuPrice,
  DIETARY_TAGS,
  ALLERGENS,
  canEditMenuContent,
  canManageAvailability,
  type MenuItem,
  type ItemVariant,
  type ItemLocationOverride,
} from "../content";
it("resolves explicit false/zero without losing inherited fields", () => {
  const item = { base_price: 20, is_visible: true, is_available: true } as MenuItem;
  expect(
    resolveItem(item, {
      price_override: 0,
      is_available_override: false,
      is_visible_override: null,
    } as ItemLocationOverride),
  ).toMatchObject({ base_price: 0, is_available: false, is_visible: true });
});
it("variant prices are absolute and available minimum is used", () => {
  const item = { base_price: 10 } as MenuItem;
  expect(
    startingPrice(item, [
      { price: 20, is_available: true },
      { price: 15, is_available: true },
      { price: 1, is_available: false },
    ] as ItemVariant[]),
  ).toBe(15);
  expect(startingPrice(item, [])).toBe(10);
});
it("sorting is stable and does not mutate input", () => {
  const rows = [
    { id: "b", sort_order: 0 },
    { id: "a", sort_order: 0 },
  ];
  expect(sortContent(rows)[0]?.id).toBe("a");
  expect(rows[0]?.id).toBe("b");
});
it("fallback translation retains its language", () =>
  expect(localizedContent({ he: "קפה" }, "en")).toEqual({ text: "קפה", lang: "he" }));
it("formats international currency", () => {
  expect(formatMenuPrice(12.5, "USD", "en")).toContain("$12.50");
  expect(formatMenuPrice(12.5, "EUR", "en")).toContain("€12.50");
});
it("taxonomy codes and role boundaries are explicit", () => {
  expect(DIETARY_TAGS).toContain("vegan");
  expect(ALLERGENS).toContain("sesame");
  expect(canEditMenuContent("editor")).toBe(true);
  expect(canEditMenuContent("staff")).toBe(false);
  expect(canManageAvailability("staff")).toBe(true);
  expect(canManageAvailability("read_only")).toBe(false);
});
