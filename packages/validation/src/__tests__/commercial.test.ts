import { it, expect } from "vitest";
import { commercialEditSchema, entitlementEditSchema } from "../commercial";
import { whatsappRequestSchema } from "../whatsapp";
it("validates independent configurable prices and rejects negative amounts", () => {
  const v = {
    id: crypto.randomUUID(),
    monthly_price_ils: 137.25,
    yearly_price_ils: 987.65,
    price_is_starting: true,
    is_active: true,
    display_order: 5,
    description: { en: "a", ar: "a", he: "a" },
    billing_note: { en: "", ar: "", he: "" },
    public_features: { en: [], ar: [], he: [] },
  };
  expect(commercialEditSchema.parse(v).yearly_price_ils).toBe(v.yearly_price_ils);
  expect(commercialEditSchema.safeParse({ ...v, monthly_price_ils: -1 }).success).toBe(false);
  expect(
    entitlementEditSchema.safeParse({
      id: v.id,
      features: [{ feature_key: "online_payments", enabled: true, limit_value: null }],
    }).success,
  ).toBe(false);
});
it("rejects price injection and invalid reservation data", () => {
  const v = {
    kind: "order",
    name: "Guest",
    phone: "+972501234567",
    notes: "",
    lines: [{ item_id: crypto.randomUUID(), variant_id: null, modifier_ids: [], quantity: 1 }],
  };
  expect(whatsappRequestSchema.safeParse(v).success).toBe(true);
  expect(whatsappRequestSchema.safeParse({ ...v, total: 1 }).success).toBe(false);
  expect(
    whatsappRequestSchema.safeParse({ ...v, lines: [{ ...v.lines[0], price: 1 }] }).success,
  ).toBe(false);
  expect(
    whatsappRequestSchema.safeParse({
      kind: "reservation",
      name: "Guest",
      phone: "-------",
      notes: "",
      guests: 0,
      date: "bad",
      time: "25:00",
    }).success,
  ).toBe(false);
});
