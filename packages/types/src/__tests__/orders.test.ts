import { describe, it, expect } from "vitest";
import {
  priceCartLine,
  cartSubtotal,
  addCartLine,
  nextOrderStatuses,
  type ContentData,
  type CartLine,
} from "../index";
const data = () =>
  ({
    menus: [{ id: "menu", status: "active", archived_at: null }],
    menu_locations: [{ menu_id: "menu", location_id: "branch", is_enabled: true }],
    menu_sections: [{ id: "section", menu_id: "menu", is_visible: true }],
    menu_items: [
      {
        id: "dish",
        section_id: "section",
        name_i18n: { en: "Dish" },
        base_price: 10.1,
        currency: "ILS",
        is_visible: true,
        is_available: true,
        archived_at: null,
      },
    ],
    item_variants: [],
    modifier_groups: [{ id: "group", min_select: 1, max_select: 1, is_required: true }],
    item_modifier_groups: [{ item_id: "dish", modifier_group_id: "group" }],
    modifiers: [
      {
        id: "extra",
        modifier_group_id: "group",
        name_i18n: { en: "Extra" },
        price_delta: 0.2,
        is_available: true,
      },
      { id: "other", modifier_group_id: "group", price_delta: 3, is_available: true },
    ],
    menu_item_location_overrides: [],
    item_allergens: [],
    item_dietary_tags: [],
  }) as unknown as ContentData;
const line: CartLine = { item_id: "dish", variant_id: null, modifier_ids: ["extra"], quantity: 3 };
describe("ordering estimates", () => {
  it("uses integer minor units for unit/line/subtotal arithmetic", () => {
    expect(priceCartLine(data(), "branch", line)).toMatchObject({
      unitCents: 1030,
      totalCents: 3090,
    });
    expect(cartSubtotal(data(), "branch", [line, { ...line, quantity: 1 }])).toBe(4120);
  });
  it("requires exactly one available variant when variants exist", () => {
    const d = data();
    d.item_variants = [
      { id: "large", item_id: "dish", price: 15, is_available: true },
    ] as ContentData["item_variants"];
    expect(() => priceCartLine(d, "branch", line)).toThrow("invalid_variant");
    expect(priceCartLine(d, "branch", { ...line, variant_id: "large" }).totalCents).toBe(4560);
    d.item_variants[0]!.is_available = false;
    expect(() => priceCartLine(d, "branch", { ...line, variant_id: "large" })).toThrow(
      "invalid_variant",
    );
  });
  it("rejects missing, excessive, duplicate and foreign modifier choices", () => {
    for (const modifier_ids of [[], ["extra", "other"], ["extra", "extra"], ["foreign"]])
      expect(() => priceCartLine(data(), "branch", { ...line, modifier_ids })).toThrow(
        "invalid_modifiers",
      );
  });
  it("preserves zero overrides and rejects branch unavailability", () => {
    const d = data();
    d.menu_item_location_overrides = [
      {
        item_id: "dish",
        location_id: "branch",
        price_override: 0,
        is_visible_override: null,
        is_available_override: null,
      },
    ] as ContentData["menu_item_location_overrides"];
    expect(priceCartLine(d, "branch", line).totalCents).toBe(60);
    d.menu_item_location_overrides[0]!.is_available_override = false;
    expect(() => priceCartLine(d, "branch", line)).toThrow("unavailable");
  });
  it("rejects draft/hidden/unassigned content", () => {
    const d = data();
    d.menus[0]!.status = "draft";
    expect(() => priceCartLine(d, "branch", line)).toThrow("unavailable");
    d.menus[0]!.status = "active";
    d.menu_sections[0]!.is_visible = false;
    expect(() => priceCartLine(d, "branch", line)).toThrow("unavailable");
    expect(() => priceCartLine(data(), "other-branch", line)).toThrow("unavailable");
  });
  it("merges matching configurations without mutating cart and caps quantities", () => {
    const input = [{ ...line }];
    expect(addCartLine(input, { ...line, quantity: 2 })[0]!.quantity).toBe(5);
    expect(input[0]!.quantity).toBe(3);
    expect(() => addCartLine(input, { ...line, quantity: 99 })).toThrow("invalid_cart");
  });
  it("terminal statuses cannot transition and preparation cannot be skipped", () => {
    expect(nextOrderStatuses.completed).toEqual([]);
    expect(nextOrderStatuses.cancelled).toEqual([]);
    expect(nextOrderStatuses.submitted).not.toContain("completed");
  });
});
