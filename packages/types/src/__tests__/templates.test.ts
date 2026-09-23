import { describe, it, expect } from "vitest";
import {
  DEFAULT_APPEARANCE,
  readableInk,
  contrastRatio,
  safePublicUrl,
  restaurantOpen,
  restaurantMenuModel,
  resolveSemanticTheme,
  semanticThemeToCssVars,
  sameAppearance,
  type RestaurantProfile,
} from "../templates";
import { TEMPLATE_CATALOG, supportedAppearance } from "../template-catalog";
import { CONTENT_TABLES, type ContentData } from "../content";
describe("template foundations", () => {
  it("has a growing catalog with stable identities and supported settings", () => {
    expect(TEMPLATE_CATALOG.length).toBeGreaterThanOrEqual(8);
    expect(new Set(TEMPLATE_CATALOG.map((t) => t.id)).size).toBe(TEMPLATE_CATALOG.length);
    for (const t of TEMPLATE_CATALOG)
      expect(
        supportedAppearance({
          ...DEFAULT_APPEARANCE,
          template: t.id,
          density: t.densities[0]!,
          version: t.version,
        }),
      ).toBe(true);
    expect(supportedAppearance({ ...DEFAULT_APPEARANCE, template: "unknown" })).toBe(false);
    expect(supportedAppearance({ ...DEFAULT_APPEARANCE, version: 99 })).toBe(false);
    expect(
      supportedAppearance({ ...DEFAULT_APPEARANCE, template: "night", density: "compact" }),
    ).toBe(false);
    const caramel = TEMPLATE_CATALOG.find((t) => t.id === "caramel");
    expect(caramel).toBeDefined();
    expect(caramel?.tags).toContain("warm");
    expect(caramel?.densities).toContain("balanced");
  });
  it("always chooses accessible ink even for pale brand colors", () => {
    for (let n = 0; n < 256; n += 7) {
      const color = "#" + n.toString(16).padStart(2, "0").repeat(3);
      expect(contrastRatio(color, readableInk(color))).toBeGreaterThanOrEqual(4.5);
    }
    expect(readableInk("#ffffff")).toBe("#000000");
  });
  it("allows only safe HTTPS media/navigation URLs", () => {
    for (const v of [
      "javascript:alert(1)",
      "data:image/svg+xml,evil",
      "//example.com",
      "http://example.com",
      "https://user:pass@example.com",
      "/unsafe",
    ])
      expect(safePublicUrl(v)).toBe("");
    expect(safePublicUrl("https://example.com/a.webp")).toBe("https://example.com/a.webp");
  });
  it("computes hours in the branch timezone, with explicit unknown and closed days", () => {
    const profile: RestaurantProfile = {
      timezone: "Asia/Jerusalem",
      address: "",
      phone: "",
      website: "",
      instagram: "",
      facebook: "",
      hours: [{ day_of_week: 1, open_time: "08:00", close_time: "12:00", is_closed: false }],
    };
    expect(restaurantOpen(profile, new Date("2026-09-21T06:00:00Z"))).toBe(true);
    expect(restaurantOpen(profile, new Date("2026-09-21T09:00:00Z"))).toBe(false);
    expect(restaurantOpen(profile, new Date("2026-09-22T06:00:00Z"))).toBe(null);
    expect(restaurantOpen({ ...profile, timezone: "invalid" }, new Date())).toBe(null);
  });
  it("projects published assigned content and preserves zero/false branch overrides", () => {
    const data = Object.fromEntries(CONTENT_TABLES.map((t) => [t, []])) as unknown as ContentData;
    Object.assign(data, {
      menus: [
        { id: "menu", status: "active", sort_order: 0 },
        { id: "draft", status: "draft", sort_order: 1 },
      ],
      menu_locations: [
        { menu_id: "menu", location_id: "branch", is_enabled: true },
        { menu_id: "draft", location_id: "branch", is_enabled: true },
      ],
      menu_sections: [{ id: "section", menu_id: "menu", is_visible: true, sort_order: 0 }],
      menu_items: [
        {
          id: "item",
          section_id: "section",
          sort_order: 0,
          base_price: 25,
          is_visible: true,
          is_available: true,
        },
      ],
      menu_item_location_overrides: [
        { item_id: "item", location_id: "branch", price_override: 0, is_available_override: false },
      ],
    });
    const model = restaurantMenuModel(data, "branch");
    expect(model.menus.map((m) => m.id)).toEqual(["menu"]);
    expect(model.sections[0]?.items[0]).toMatchObject({ price: 0, is_available: false });
    expect(restaurantMenuModel(data, "other").sections).toHaveLength(0);
    data.menu_item_location_overrides[0]!.is_visible_override = false;
    expect(restaurantMenuModel(data, "branch").sections[0]?.items).toHaveLength(0);
  });

  it("resolves semantic theme defaults and tenant overrides cleanly", () => {
    // Caramel default resolution
    const caramelDefault = resolveSemanticTheme("caramel");
    expect(caramelDefault.primary).toBe("#f07a12");
    expect(caramelDefault.accent).toBe("#ffc44d");
    expect(caramelDefault.pageBackground).toBe("#fff6e3");
    expect(caramelDefault.cardBackground).toBe("#fffdf6");
    expect(caramelDefault.buttonBackground).toBe("#2a1208");

    // Caramel custom override
    const caramelCustom = resolveSemanticTheme("caramel", {
      ...DEFAULT_APPEARANCE,
      template: "caramel",
      theme: {
        pageBackground: "#1a1a1a",
        cardBackground: "#2a2a2a",
        primary: "#3b82f6",
      },
    });
    expect(caramelCustom.pageBackground).toBe("#1a1a1a");
    expect(caramelCustom.cardBackground).toBe("#2a2a2a");
    expect(caramelCustom.primary).toBe("#3b82f6");
    expect(caramelCustom.buttonBackground).toBe("#3b82f6");
    expect(caramelCustom.accent).toBe("#ffc44d"); // Inherited from caramel base

    // CSS variables emission
    const cssVars = semanticThemeToCssVars(caramelCustom);
    expect(cssVars["--rt-page-bg"]).toBe("#1a1a1a");
    expect(cssVars["--rt-card-bg"]).toBe("#2a2a2a");
    expect(cssVars["--rt-primary"]).toBe("#3b82f6");
    expect(cssVars["--rt-btn-bg"]).toBe("#3b82f6");
    expect(cssVars["--rt-border"]).toBeDefined();
    expect(cssVars["--rt-open"]).toBeDefined();
    expect(cssVars["--rt-closed"]).toBeDefined();

    // sameAppearance tracking of theme changes
    const appA = { ...DEFAULT_APPEARANCE, template: "caramel" };
    const appB = {
      ...DEFAULT_APPEARANCE,
      template: "caramel",
      theme: { pageBackground: "#000000" },
    };
    expect(sameAppearance(appA, appB)).toBe(false);
    expect(sameAppearance(appB, { ...appB })).toBe(true);

    // Key-ordering invariance in sameAppearance
    const appC = {
      ...DEFAULT_APPEARANCE,
      template: "caramel",
      theme: { primary: "#ff0000", accent: "#00ff00", pageBackground: "#ffffff" },
    };
    const appD = {
      ...DEFAULT_APPEARANCE,
      template: "caramel",
      theme: { pageBackground: "#ffffff", primary: "#ff0000", accent: "#00ff00" },
    };
    expect(sameAppearance(appC, appD)).toBe(true);

    // Verify all 9 templates in TEMPLATE_CATALOG resolve their default semantic theme cleanly
    for (const item of TEMPLATE_CATALOG) {
      const theme = resolveSemanticTheme(item.id);
      expect(theme.primary).toMatch(/^#[0-9a-f]{6}$/i);
      expect(theme.accent).toMatch(/^#[0-9a-f]{6}$/i);
      expect(theme.pageBackground).toMatch(/^#[0-9a-f]{6}$/i);
      expect(theme.cardBackground).toMatch(/^#[0-9a-f]{6}$/i);
      expect(theme.border).toMatch(/^#[0-9a-f]{6}$/i);
      expect(theme.navBackground).toMatch(/^#[0-9a-f]{6}$/i);
      expect(theme.activeCategoryBackground).toMatch(/^#[0-9a-f]{6}$/i);
      expect(theme.buttonBackground).toMatch(/^#[0-9a-f]{6}$/i);
      expect(theme.priceText).toMatch(/^#[0-9a-f]{6}$/i);
      expect(theme.modalBackground).toMatch(/^#[0-9a-f]{6}$/i);
      expect(theme.footerBackground).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
