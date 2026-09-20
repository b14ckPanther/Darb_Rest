import { it, expect } from "vitest";
import { tableInputSchema } from "../tables";
const input = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  location_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  revision: 0,
  action: "create",
  name: "  12  ",
  area: "Patio",
  is_active: true,
};
it("normalizes table labels and bounds input", () => {
  expect(tableInputSchema.parse(input).name).toBe("12");
  for (const patch of [
    { name: "" },
    { name: "a".repeat(65) },
    { area: "a".repeat(65) },
    { revision: -1 },
    { action: "delete" },
    { location_id: "1" },
  ])
    expect(tableInputSchema.safeParse({ ...input, ...patch }).success).toBe(false);
});
it("rejects client-selected tenant IDs and QR tokens", () => {
  expect(tableInputSchema.safeParse({ ...input, business_id: input.id }).success).toBe(false);
  expect(tableInputSchema.safeParse({ ...input, token: "a".repeat(64) }).success).toBe(false);
});
