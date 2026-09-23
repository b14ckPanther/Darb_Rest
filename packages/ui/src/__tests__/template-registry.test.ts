import { it, expect } from "vitest";
import { TEMPLATE_CATALOG } from "@darb-rest/types";
import { RESTAURANT_TEMPLATES, restaurantTemplate } from "../restaurant/registry";
it("binds every catalog definition to presentation without a fixed catalog limit", () => {
  expect(RESTAURANT_TEMPLATES.map((t) => t.id)).toEqual(TEMPLATE_CATALOG.map((t) => t.id));
  for (const t of RESTAURANT_TEMPLATES) expect(typeof t.Hero).toBe("function");
  expect(restaurantTemplate("future-unknown").id).toBe("signature");
  expect(restaurantTemplate("caramel").id).toBe("caramel");
  expect(restaurantTemplate("caramel").className).toBe("rt-caramel");
  expect(new Set(RESTAURANT_TEMPLATES.map((t) => t.Hero)).size).toBe(RESTAURANT_TEMPLATES.length);
});
