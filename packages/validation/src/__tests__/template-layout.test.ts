import { it, expect } from "vitest";
import { DEFAULT_APPEARANCE, DEFAULT_LAYOUT, LAYOUT_OPTIONS } from "@darb-rest/types";
import { appearanceSchema } from "../appearance";
it("accepts legacy snapshots and every bounded composition choice", () => {
  expect(appearanceSchema.safeParse(DEFAULT_APPEARANCE).success).toBe(true);
  for (const [key, values] of Object.entries(LAYOUT_OPTIONS))
    for (const value of values)
      expect(
        appearanceSchema.safeParse({
          ...DEFAULT_APPEARANCE,
          layout: { ...DEFAULT_LAYOUT, [key]: value },
        }).success,
      ).toBe(true);
});
it("rejects partial, injected and unknown layout controls", () => {
  for (const layout of [
    null,
    {},
    { ...DEFAULT_LAYOUT, focal: "10%; position:fixed" },
    { ...DEFAULT_LAYOUT, footer: false },
    { ...DEFAULT_LAYOUT, css: "body{}" },
    { ...DEFAULT_LAYOUT, font: "custom" },
    { ...DEFAULT_LAYOUT, hero: "9999px" },
  ])
    expect(appearanceSchema.safeParse({ ...DEFAULT_APPEARANCE, layout }).success).toBe(false);
});
