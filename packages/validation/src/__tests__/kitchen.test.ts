import { it, expect } from "vitest";
import { kitchenActionSchema, kitchenQuerySchema } from "../kitchen";
const id = "e8000000-0000-4000-8000-000000000001";
const action = { action_id: id, location_id: id, id, revision: 1, status: "accepted", reason: "" };
it("requires a bounded cancellation reason and operation identity", () => {
  expect(kitchenActionSchema.safeParse(action).success).toBe(true);
  for (const patch of [
    { action_id: "x" },
    { revision: 0 },
    { status: "submitted" },
    { status: "cancelled" },
    { reason: "unexpected" },
    { business_id: id },
    { status: "cancelled", reason: "a".repeat(501) },
  ])
    expect(kitchenActionSchema.safeParse({ ...action, ...patch }).success).toBe(false);
  expect(
    kitchenActionSchema.parse({ ...action, status: "cancelled", reason: " Sold out " }).reason,
  ).toBe("Sold out");
});
it("bounds branch queries and excludes drafts", () => {
  expect(
    kitchenQuerySchema.safeParse({ location_id: id, status: "active", offset: 0 }).success,
  ).toBe(true);
  for (const patch of [
    { status: "draft" },
    { offset: -1 },
    { offset: 100001 },
    { location_id: "x" },
  ])
    expect(
      kitchenQuerySchema.safeParse({ location_id: id, status: "active", offset: 0, ...patch })
        .success,
    ).toBe(false);
});
