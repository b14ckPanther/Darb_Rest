import { it, expect } from "vitest";
import { DEFAULT_APPEARANCE } from "@darb-rest/types";
import { appearanceSaveSchema } from "../appearance";
it("validates safe appearance and rejects arbitrary controls", () => {
  const value = {
    expectedBusinessId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    revision: 0,
    settings: DEFAULT_APPEARANCE,
    publish: false,
  };
  expect(appearanceSaveSchema.safeParse(value).success).toBe(true);
  for (const change of [
    { primary: "red;position:fixed" },
    { cover: "javascript:alert(1)" },
    { logo: "http://example.com/a.png" },
    { css: "body{display:none}" },
    { version: 1.5 },
    { density: "unbounded" },
  ])
    expect(
      appearanceSaveSchema.safeParse({ ...value, settings: { ...value.settings, ...change } })
        .success,
    ).toBe(false);
  expect(appearanceSaveSchema.safeParse({ ...value, business_id: "other" }).success).toBe(false);
  expect(appearanceSaveSchema.safeParse({ ...value, revision: -1 }).success).toBe(false);
});
