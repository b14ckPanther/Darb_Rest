import {
  resolveItem,
  sortContent,
  startingPrice,
  type ContentData,
  type ContentName,
} from "./content";

export type TemplateDensity = "airy" | "balanced" | "compact";
export const LAYOUT_OPTIONS = {
  hero: ["template", "compact", "immersive"],
  focal: ["center", "top", "bottom"],
  navigation: ["template", "pills", "index"],
  cards: ["template", "soft", "square"],
  information: ["before", "after"],
  cta: ["filled", "outline"],
  footer: ["compact", "contact"],
  surface: ["template", "ivory", "white"],
} as const;
export type TemplateLayout = {
  [K in keyof typeof LAYOUT_OPTIONS]: (typeof LAYOUT_OPTIONS)[K][number];
};
export const DEFAULT_LAYOUT: TemplateLayout = {
  hero: "template",
  focal: "center",
  navigation: "template",
  cards: "template",
  information: "before",
  cta: "filled",
  footer: "compact",
  surface: "template",
};
export function resolvedLayout(settings: AppearanceSettings): TemplateLayout {
  const result = { ...DEFAULT_LAYOUT };
  for (const key of Object.keys(LAYOUT_OPTIONS) as (keyof TemplateLayout)[]) {
    const value = settings.layout?.[key];
    if (value && (LAYOUT_OPTIONS[key] as readonly string[]).includes(value))
      Object.assign(result, { [key]: value });
  }
  return result;
}
export interface AppearanceSettings {
  layout?: TemplateLayout;
  template: string;
  version: number;
  primary: string;
  accent: string;
  logo: string;
  cover: string;
  coverVideo: string;
  density: TemplateDensity;
  images: boolean;
}
export interface TemplateMetadata {
  id: string;
  version: number;
  name: ContentName;
  description: ContentName;
  tags: string[];
  recommendedBusinessTypes: string[];
  previewImage?: string;
  premium: boolean;
  densities: readonly TemplateDensity[];
  layoutControls: readonly (keyof TemplateLayout)[];
  supportsImages: boolean;
  supportsCover: boolean;
  supportsVideo: boolean;
}
export const DEFAULT_APPEARANCE: AppearanceSettings = {
  template: "signature",
  version: 1,
  primary: "#1a3c2a",
  accent: "#d5b17a",
  logo: "",
  cover: "",
  coverVideo: "",
  density: "balanced",
  images: true,
};
export function safePublicUrl(value: string | null | undefined): string {
  if (!value || value.length > 2048) return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : "";
  } catch {
    return "";
  }
}
export function contrastRatio(a: string, b: string) {
  const luminance = (hex: string) => {
    const rgb = [1, 3, 5]
      .map((n) => parseInt(hex.slice(n, n + 2), 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return rgb[0]! * 0.2126 + rgb[1]! * 0.7152 + rgb[2]! * 0.0722;
  };
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
export function readableInk(hex: string) {
  const safe = /^#[0-9a-f]{6}$/i.test(hex) ? hex : DEFAULT_APPEARANCE.primary;
  return contrastRatio(safe, "#ffffff") >= contrastRatio(safe, "#000000") ? "#ffffff" : "#000000";
}
export interface RestaurantProfile {
  timezone: string;
  address: string;
  phone: string;
  website: string;
  instagram: string;
  facebook: string;
  hours: { day_of_week: number; open_time: string; close_time: string; is_closed: boolean }[];
}
export function restaurantOpen(profile: RestaurantProfile, now = new Date()): boolean | null {
  if (!profile.hours.length) return null;
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: profile.timezone,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(now);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    const day = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(get("weekday")) + 1;
    if (!profile.hours.some((h) => h.day_of_week === day)) return null;
    const minutes = Number(get("hour")) * 60 + Number(get("minute"));
    const minute = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
    return profile.hours.some(
      (h) =>
        h.day_of_week === day &&
        !h.is_closed &&
        minutes >= minute(h.open_time) &&
        minutes < minute(h.close_time),
    );
  } catch {
    return null;
  }
}
/** Shared selection/projection for presentation. Authoritative checkout still reprices in PostgreSQL. */
export function restaurantMenuModel(
  data: ContentData,
  branch: string,
  selected = "",
  publishedOnly = true,
) {
  const menus = sortContent(
    data.menus.filter(
      (m) =>
        (publishedOnly ? m.status === "active" : m.status !== "archived") &&
        data.menu_locations.some(
          (a) => a.menu_id === m.id && a.location_id === branch && a.is_enabled,
        ),
    ),
  );
  const menu = menus.find((m) => m.id === selected) ?? menus.find((m) => m.is_default) ?? menus[0];
  const sections = sortContent(
    data.menu_sections.filter((s) => s.menu_id === menu?.id && s.is_visible),
  ).map((section) => ({
    ...section,
    items: sortContent(data.menu_items.filter((i) => i.section_id === section.id && !i.archived_at))
      .map((i) =>
        resolveItem(
          i,
          data.menu_item_location_overrides.find(
            (o) => o.item_id === i.id && o.location_id === branch,
          ),
        ),
      )
      .filter((i) => i.is_visible)
      .map((item) => {
        const variants = sortContent(
          data.item_variants.filter((v) => v.item_id === item.id && v.is_available),
        );
        return {
          ...item,
          price: startingPrice(item, variants),
          variants,
          groups: data.modifier_groups
            .filter((g) =>
              data.item_modifier_groups.some(
                (a) => a.item_id === item.id && a.modifier_group_id === g.id,
              ),
            )
            .map((g) => ({
              ...g,
              options: sortContent(
                data.modifiers.filter((m) => m.modifier_group_id === g.id && m.is_available),
              ),
            })),
          dietary: data.item_dietary_tags.filter((t) => t.item_id === item.id),
          allergens: data.item_allergens.filter((a) => a.item_id === item.id),
        };
      }),
  }));
  return { menus, menu, sections };
}
export type RestaurantMenuModel = ReturnType<typeof restaurantMenuModel>;

/** Locale navigation changes only the locale; keep branch, order, QR and fragment intact. */
export function restaurantLocaleUrl(path: string, locale: "ar" | "he" | "en") {
  const url = new URL(path, "https://restaurant.invalid");
  url.pathname = `/${locale}${url.pathname.replace(/^\/(ar|he|en)(?=\/|$)/, "")}`;
  return url.pathname + url.search + url.hash;
}

/** Stable logical media references; never fetch this reserved host over the network. */
export function brandingPath(value: string): string | null {
  const match =
    /^https:\/\/media\.darb\.invalid\/branding\/([0-9a-f-]{36}\/([0-9a-f-]{36})\.webp)$/.exec(
      value,
    );
  return match?.[1] ?? null;
}
export function brandingUrl(value: string, preview = false): string {
  const path = brandingPath(value);
  return path
    ? `${preview ? "/api/appearance-media" : "/restaurant-media"}?path=${encodeURIComponent(path)}`
    : safePublicUrl(value);
}
export function sameAppearance(a: AppearanceSettings, b: AppearanceSettings) {
  return (
    JSON.stringify(resolvedLayout(a)) === JSON.stringify(resolvedLayout(b)) &&
    (Object.keys(DEFAULT_APPEARANCE) as (keyof AppearanceSettings)[]).every((k) => a[k] === b[k])
  );
}

/** Fixed responsive widths only; external legacy URLs are never proxied or transformed. */
export function brandingSrcSet(value: string, preview = false) {
  if (!brandingPath(value)) return undefined;
  const src = brandingUrl(value, preview);
  return [480, 960, 1440].map((width) => `${src}&width=${width} ${width}w`).join(", ");
}
