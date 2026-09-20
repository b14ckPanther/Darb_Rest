import { it, expect } from "vitest";
import { TASK_NEXT, TABLE_STATES } from "../operations";
it("item tasks advance only once through preparation", () => {
  expect(TASK_NEXT.pending).toBe("preparing");
  expect(TASK_NEXT.preparing).toBe("ready");
  expect(TASK_NEXT.ready).toBeNull();
  expect(TASK_NEXT.cancelled).toBeNull();
});
it("table operations exclude reservations and order statuses", () => {
  expect(TABLE_STATES).toEqual(["available", "occupied", "needs_attention", "cleaning"]);
});
