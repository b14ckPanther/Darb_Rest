import { it, expect } from "vitest";
import { isKitchenSignal, kitchenMinutes, kitchenArrivals, type KitchenOrder } from "../kitchen";
import { nextOrderStatuses } from "../orders";
it("ignores signals outside the selected tenant and branch", () => {
  expect(isKitchenSignal({ business_id: "a", location_id: "x" }, "a", "x")).toBe(true);
  expect(isKitchenSignal({ business_id: "b", location_id: "x" }, "a", "x")).toBe(false);
  expect(isKitchenSignal({ business_id: "a", location_id: "y" }, "a", "x")).toBe(false);
  expect(isKitchenSignal({}, "a", "x")).toBe(false);
});
it("tracks arrivals without duplicate alerts or status-change alerts", () => {
  const rows = [
    { id: "old", status: "submitted" },
    { id: "new", status: "submitted" },
    { id: "accepted", status: "accepted" },
  ] as KitchenOrder[];
  expect(kitchenArrivals(new Set(["old"]), rows)).toEqual(["new"]);
  expect(kitchenArrivals(new Set(["old", "new"]), rows)).toEqual([]);
});
it("elapsed minutes clamp clock skew and handle old orders", () => {
  expect(kitchenMinutes("2026-09-19T10:00:00Z", Date.parse("2026-09-19T11:03:59Z"))).toBe(63);
  expect(kitchenMinutes("2026-09-19T10:00:00Z", 0)).toBe(0);
});
it("never offers jumps or terminal transitions", () => {
  expect(nextOrderStatuses.submitted).toEqual(["accepted", "cancelled"]);
  expect(nextOrderStatuses.accepted).toEqual(["preparing", "cancelled"]);
  expect(nextOrderStatuses.preparing).toEqual(["ready", "cancelled"]);
  expect(nextOrderStatuses.ready).toEqual(["completed", "cancelled"]);
  expect(nextOrderStatuses.completed).toEqual([]);
  expect(nextOrderStatuses.cancelled).toEqual([]);
});
