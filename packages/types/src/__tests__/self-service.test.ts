import { describe, it, expect } from "vitest";
import {
  restaurantLocaleUrl,
  brandingPath,
  brandingUrl,
  sameAppearance,
  DEFAULT_APPEARANCE,
} from "../templates";
describe("self-service context and media", () => {
  it("preserves deep path, receipt, branch, table and section across locales", () => {
    for (const locale of ["ar", "he", "en"] as const)
      expect(
        restaurantLocaleUrl(
          "/en/order/cafe/central?order=abc&table=opaque&branch=central#dish",
          locale,
        ),
      ).toBe(`/${locale}/order/cafe/central?order=abc&table=opaque&branch=central#dish`);
    expect(restaurantLocaleUrl("/cafe?table=opaque", "he")).toBe("/he/cafe?table=opaque");
  });
  it("resolves only controlled immutable media paths and preserves legacy HTTPS", () => {
    const path = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb.webp";
    const ref = "https://media.darb.invalid/branding/" + path;
    expect(brandingPath(ref)).toBe(path);
    expect(brandingUrl(ref, true)).toBe("/api/appearance-media?path=" + encodeURIComponent(path));
    expect(brandingUrl(ref)).toBe("/restaurant-media?path=" + encodeURIComponent(path));
    for (const suffix of ["../private.webp", "a.svg", path + "?evil=1", path + "/../x"])
      expect(brandingPath("https://media.darb.invalid/branding/" + suffix)).toBeNull();
    expect(brandingUrl("javascript:alert(1)")).toBe("");
    expect(brandingUrl("https://example.com/logo.png")).toBe("https://example.com/logo.png");
  });
  it("compares meaningful appearance fields independently of object key order", () => {
    expect(sameAppearance(DEFAULT_APPEARANCE, { ...DEFAULT_APPEARANCE })).toBe(true);
    expect(
      sameAppearance(DEFAULT_APPEARANCE, {
        ...DEFAULT_APPEARANCE,
        cover: "https://example.com/new.webp",
      }),
    ).toBe(false);
  });
});

it("composition changes are detected without rewriting legacy snapshots", async () => {
  const { DEFAULT_LAYOUT, resolvedLayout, brandingSrcSet } = await import("../templates");
  expect(
    sameAppearance(DEFAULT_APPEARANCE, { ...DEFAULT_APPEARANCE, layout: DEFAULT_LAYOUT }),
  ).toBe(true);
  expect(
    sameAppearance(DEFAULT_APPEARANCE, {
      ...DEFAULT_APPEARANCE,
      layout: { ...DEFAULT_LAYOUT, focal: "top" },
    }),
  ).toBe(false);
  expect(
    resolvedLayout({
      ...DEFAULT_APPEARANCE,
      layout: { ...DEFAULT_LAYOUT, hero: "injected" } as never,
    }).hero,
  ).toBe("template");
  expect(brandingSrcSet("https://external.example/cover.jpg")).toBeUndefined();
  const ref =
    "https://media.darb.invalid/branding/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb.webp";
  expect(brandingSrcSet(ref)).toContain("&width=480 480w");
  expect(brandingSrcSet(ref)).toContain("&width=1440 1440w");
});
