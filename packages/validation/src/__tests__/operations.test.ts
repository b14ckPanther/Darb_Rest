import { it, expect } from "vitest";
import { restaurantActionSchema, restaurantQuerySchema } from "../operations";
const id = "e9000000-0000-4000-8000-000000000001";
const base = { action_id: id, location_id: id };
it("requires bounded named stations and revisions", () => {
  expect(
    restaurantActionSchema.parse({
      ...base,
      action: "station",
      payload: { id, revision: 0, name: " Grill ", active: true },
    }).payload,
  ).toMatchObject({ name: "Grill" });
  for (const name of ["", "x".repeat(65)])
    expect(
      restaurantActionSchema.safeParse({
        ...base,
        action: "station",
        payload: { id, revision: 0, name, active: true },
      }).success,
    ).toBe(false);
});
it("routing targets existing item or category IDs without accepting a tenant", () => {
  for (const kind of ["item", "section"])
    expect(
      restaurantActionSchema.safeParse({
        ...base,
        action: "route",
        payload: { id, station_id: id, kind, enabled: true },
      }).success,
    ).toBe(true);
  for (const payload of [
    { id, station_id: id, kind: "menu", enabled: true },
    { id, station_id: "1", kind: "item", enabled: true },
    { id, station_id: id, kind: "item", enabled: true, business_id: id },
  ])
    expect(restaurantActionSchema.safeParse({ ...base, action: "route", payload }).success).toBe(
      false,
    );
});
it("task mutations cannot set terminal order states or skip revision checks", () => {
  for (const state of ["preparing", "ready"])
    expect(
      restaurantActionSchema.safeParse({
        ...base,
        action: "task",
        payload: { id, revision: 1, state },
      }).success,
    ).toBe(true);
  for (const state of ["completed", "cancelled", "pending"])
    expect(
      restaurantActionSchema.safeParse({
        ...base,
        action: "task",
        payload: { id, revision: 1, state },
      }).success,
    ).toBe(false);
});
it("rush, assignment, table state and preferences are strictly typed", () => {
  for (const [action, payload] of [
    ["rush", { id, revision: 1, enabled: true }],
    ["assign_order", { id, revision: 1, user_id: null }],
    ["table_state", { id, revision: 1, state: "cleaning" }],
    ["preferences", { new_orders: false, ready_orders: true }],
  ])
    expect(restaurantActionSchema.safeParse({ ...base, action, payload }).success).toBe(true);
  expect(
    restaurantActionSchema.safeParse({
      ...base,
      action: "rush",
      payload: { id, revision: 0, enabled: "true" },
    }).success,
  ).toBe(false);
  expect(
    restaurantActionSchema.safeParse({
      ...base,
      action: "table_state",
      payload: { id, revision: 1, state: "reserved" },
    }).success,
  ).toBe(false);
  expect(
    restaurantActionSchema.safeParse({
      ...base,
      business_id: id,
      action: "preferences",
      payload: { new_orders: true, ready_orders: true },
    }).success,
  ).toBe(false);
});
it("station and unassigned filters cannot contradict each other", () => {
  const q = {
    location_id: id,
    status: "active",
    offset: 0,
    station_id: null,
    unassigned: true,
    mine: false,
  };
  expect(restaurantQuerySchema.safeParse(q).success).toBe(true);
  expect(restaurantQuerySchema.safeParse({ ...q, station_id: id }).success).toBe(false);
  expect(restaurantQuerySchema.safeParse({ ...q, offset: -1 }).success).toBe(false);
});
