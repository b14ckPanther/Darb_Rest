import { describe, it, expect } from "vitest";
import {
  contentNameSchema,
  contentPriceSchema,
  modifierGroupSchema,
  validModifierCapacity,
  branchOverrideSchema,
  imageMetadataSchema,
} from "../content";
describe("content validation", () => {
  it("requires a meaningful translation, allowing one language", () => {
    expect(contentNameSchema.safeParse({ he: "תפריט" }).success).toBe(true);
    expect(contentNameSchema.safeParse({ ar: "  ", en: "" }).success).toBe(false);
    expect(contentNameSchema.safeParse({ fr: "Nom" }).success).toBe(false);
  });
  it("accepts decimal money and rejects negative, infinite and sub-cent amounts", () => {
    for (const v of [0, 12, 12.99]) expect(contentPriceSchema.safeParse(v).success).toBe(true);
    for (const v of [-1, Infinity, 0.001])
      expect(contentPriceSchema.safeParse(v).success).toBe(false);
  });
  it("enforces required groups and available option capacity", () => {
    expect(validModifierCapacity(1, 2, [{ is_available: true }, { is_available: false }])).toBe(
      true,
    );
    expect(validModifierCapacity(2, 2, [{ is_available: true }, { is_available: false }])).toBe(
      false,
    );
    expect(validModifierCapacity(0, 3, [{ is_available: true }])).toBe(false);
    expect(
      modifierGroupSchema.safeParse({
        id: crypto.randomUUID(),
        name_i18n: { en: "Milk" },
        min_select: 1,
        max_select: 1,
        is_required: false,
      }).success,
    ).toBe(false);
  });
  it("preserves inherit null and zero-priced overrides", () => {
    expect(
      branchOverrideSchema.safeParse({
        id: crypto.randomUUID(),
        item_id: crypto.randomUUID(),
        location_id: crypto.randomUUID(),
        price_override: 0,
        is_visible_override: null,
        is_available_override: false,
      }).success,
    ).toBe(true);
  });
  it("rejects unsafe image metadata", () => {
    expect(
      imageMetadataSchema.safeParse({ type: "image/svg+xml", size: 100, width: 100, height: 100 })
        .success,
    ).toBe(false);
    expect(
      imageMetadataSchema.safeParse({ type: "image/jpeg", size: 100, width: 10000, height: 10000 })
        .success,
    ).toBe(false);
  });
});
