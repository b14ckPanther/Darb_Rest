import { it, expect } from "vitest";
import { orderInputSchema } from "../orders";
const input = () => ({
  id: crypto.randomUUID(),
  location_id: crypto.randomUUID(),
  lines: [{ item_id: crypto.randomUUID(), variant_id: null, modifier_ids: [], quantity: 1 }],
  customer_name: "Guest",
  customer_phone: "",
  fulfillment_mode: "dine_in",
  expected_subtotal_cents: 3200,
  revision: 0,
  submit: false,
});
it("allows minimum dine-in details but requires takeaway phone", () => {
  expect(orderInputSchema.safeParse(input()).success).toBe(true);
  expect(orderInputSchema.safeParse({ ...input(), fulfillment_mode: "takeaway" }).success).toBe(
    false,
  );
  expect(
    orderInputSchema.safeParse({
      ...input(),
      fulfillment_mode: "takeaway",
      customer_phone: "+972 50 1234567",
    }).success,
  ).toBe(true);
});
it("rejects client price fields and unrecognized payload fields", () => {
  const i = input();
  expect(orderInputSchema.safeParse({ ...i, lines: [{ ...i.lines[0], price: 1 }] }).success).toBe(
    false,
  );
  expect(orderInputSchema.safeParse({ ...i, business_id: crypto.randomUUID() }).success).toBe(
    false,
  );
});
it("rejects fractional quantity, duplicate modifiers and empty carts", () => {
  const i = input();
  const id = crypto.randomUUID();
  expect(orderInputSchema.safeParse({ ...i, lines: [], submit: true }).success).toBe(false);
  expect(
    orderInputSchema.safeParse({ ...i, lines: [{ ...i.lines[0], quantity: 0.5 }] }).success,
  ).toBe(false);
  expect(
    orderInputSchema.safeParse({ ...i, lines: [{ ...i.lines[0], modifier_ids: [id, id] }] })
      .success,
  ).toBe(false);
});
