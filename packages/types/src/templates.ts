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
export interface SemanticTheme {
  primary?: string;
  accent?: string;
  pageBackground?: string;
  cardBackground?: string;
  alternateSurface?: string;
  text?: string;
  textMuted?: string;
  border?: string;
  navBackground?: string;
  activeCategoryBackground?: string;
  activeCategoryText?: string;
  buttonBackground?: string;
  buttonText?: string;
  priceBackground?: string;
  priceText?: string;
  heroOverlay?: string;
  openStatus?: string;
  closedStatus?: string;
  modalBackground?: string;
  modalText?: string;
  footerBackground?: string;
  footerText?: string;
}

export type ResolvedSemanticTheme = Required<SemanticTheme>;

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
  theme?: SemanticTheme;
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
export const DEFAULT_THEME_BASE: ResolvedSemanticTheme = {
  primary: "#1a3c2a",
  accent: "#d5b17a",
  pageBackground: "#faf8f4",
  cardBackground: "#ffffff",
  alternateSurface: "#f2efe9",
  text: "#242720",
  textMuted: "#5a5e54",
  border: "#d9d9ce",
  navBackground: "#faf8f4",
  activeCategoryBackground: "#1a3c2a",
  activeCategoryText: "#ffffff",
  buttonBackground: "#1a3c2a",
  buttonText: "#ffffff",
  priceBackground: "#faf8f4",
  priceText: "#1a3c2a",
  heroOverlay: "#000000",
  openStatus: "#1b8f4a",
  closedStatus: "#8f2430",
  modalBackground: "#ffffff",
  modalText: "#242720",
  footerBackground: "#1a3c2a",
  footerText: "#ffffff",
};

export const TEMPLATE_DEFAULT_THEMES: Record<string, ResolvedSemanticTheme> = {
  signature: { ...DEFAULT_THEME_BASE, primary: "#1a3c2a", accent: "#d5b17a" },
  editorial: {
    ...DEFAULT_THEME_BASE,
    primary: "#242720",
    accent: "#d5b17a",
    border: "#242720",
    activeCategoryBackground: "#242720",
    buttonBackground: "#242720",
    priceText: "#242720",
  },
  minimal: {
    ...DEFAULT_THEME_BASE,
    primary: "#242720",
    accent: "#6b7280",
    pageBackground: "#ffffff",
    cardBackground: "#ffffff",
    alternateSurface: "#f7f7f7",
    text: "#111827",
    textMuted: "#6b7280",
    border: "#e5e7eb",
    navBackground: "#ffffff",
    activeCategoryBackground: "#242720",
    buttonBackground: "#242720",
    priceText: "#242720",
  },
  cafe: {
    ...DEFAULT_THEME_BASE,
    primary: "#6e473b",
    accent: "#c99a6b",
    pageBackground: "#f3eadd",
    cardBackground: "#ffffff",
    alternateSurface: "#e8dcce",
    border: "#d3c6b4",
    navBackground: "#f3eadd",
    activeCategoryBackground: "#6e473b",
    buttonBackground: "#6e473b",
    priceText: "#6e473b",
    footerBackground: "#43281c",
    footerText: "#ffffff",
  },
  quick: {
    ...DEFAULT_THEME_BASE,
    primary: "#b91c1c",
    accent: "#f59e0b",
    pageBackground: "#fafafa",
    cardBackground: "#ffffff",
    alternateSurface: "#f4f4f5",
    text: "#18181b",
    textMuted: "#71717a",
    border: "#e4e4e7",
    navBackground: "#ffffff",
    activeCategoryBackground: "#b91c1c",
    buttonBackground: "#b91c1c",
    priceText: "#b91c1c",
    footerBackground: "#18181b",
    footerText: "#ffffff",
  },
  bold: {
    ...DEFAULT_THEME_BASE,
    primary: "#18181b",
    accent: "#facc15",
    pageBackground: "#fefefe",
    cardBackground: "#ffffff",
    alternateSurface: "#f4f4f5",
    text: "#09090b",
    textMuted: "#71717a",
    border: "#09090b",
    navBackground: "#ffffff",
    activeCategoryBackground: "#18181b",
    buttonBackground: "#18181b",
    priceText: "#18181b",
    footerBackground: "#09090b",
    footerText: "#ffffff",
  },
  night: {
    ...DEFAULT_THEME_BASE,
    primary: "#c8a97e",
    accent: "#e0c9a6",
    pageBackground: "#121316",
    cardBackground: "#1b1d22",
    alternateSurface: "#23262d",
    text: "#f0ede6",
    textMuted: "#9ca3af",
    border: "#2d3139",
    navBackground: "#121316",
    activeCategoryBackground: "#c8a97e",
    activeCategoryText: "#121316",
    buttonBackground: "#c8a97e",
    buttonText: "#121316",
    priceBackground: "#1b1d22",
    priceText: "#e0c9a6",
    heroOverlay: "#000000",
    modalBackground: "#1b1d22",
    modalText: "#f0ede6",
    footerBackground: "#0b0c0e",
    footerText: "#f0ede6",
  },
  bakery: {
    ...DEFAULT_THEME_BASE,
    primary: "#b45309",
    accent: "#fde68a",
    pageBackground: "#fff6e7",
    cardBackground: "#ffffff",
    alternateSurface: "#fef0d7",
    border: "#dbceb9",
    navBackground: "#fff6e7",
    activeCategoryBackground: "#b45309",
    buttonBackground: "#b45309",
    priceText: "#b45309",
    footerBackground: "#451a03",
    footerText: "#ffffff",
  },
  bistro: {
    ...DEFAULT_THEME_BASE,
    primary: "#803d29",
    accent: "#e3b57f",
    activeCategoryBackground: "#803d29",
    buttonBackground: "#803d29",
    priceText: "#803d29",
    footerBackground: "#2c1c18",
  },
  atelier: {
    ...DEFAULT_THEME_BASE,
    primary: "#3d4035",
    accent: "#c2a649",
    activeCategoryBackground: "#3d4035",
    buttonBackground: "#3d4035",
    priceText: "#3d4035",
    footerBackground: "#2b2e24",
  },
  botanical: {
    ...DEFAULT_THEME_BASE,
    primary: "#2d4a3e",
    accent: "#a3b18a",
    activeCategoryBackground: "#2d4a3e",
    buttonBackground: "#2d4a3e",
    priceText: "#2d4a3e",
    footerBackground: "#1a2c25",
  },
  terrace: {
    ...DEFAULT_THEME_BASE,
    primary: "#2b5b84",
    accent: "#e8927c",
    activeCategoryBackground: "#2b5b84",
    buttonBackground: "#2b5b84",
    priceText: "#2b5b84",
    footerBackground: "#1a3952",
  },
  essence: {
    ...DEFAULT_THEME_BASE,
    primary: "#403b37",
    accent: "#b09b88",
    activeCategoryBackground: "#403b37",
    buttonBackground: "#403b37",
    priceText: "#403b37",
    footerBackground: "#262320",
  },
  nordic: {
    ...DEFAULT_THEME_BASE,
    primary: "#2e3b43",
    accent: "#93b5c6",
    pageBackground: "#f5f6f8",
    activeCategoryBackground: "#2e3b43",
    buttonBackground: "#2e3b43",
    priceText: "#2e3b43",
    footerBackground: "#1b242a",
  },
  caramel: {
    primary: "#f07a12",
    accent: "#ffc44d",
    pageBackground: "#fff6e3",
    cardBackground: "#fffdf6",
    alternateSurface: "#ffe9b8",
    text: "#2b1106",
    textMuted: "#8d4316",
    border: "#eedfce",
    navBackground: "#fff6e3",
    activeCategoryBackground: "#f07a12",
    activeCategoryText: "#ffffff",
    buttonBackground: "#2a1208",
    buttonText: "#fffdf6",
    priceBackground: "#ffe9b8",
    priceText: "#c2410c",
    heroOverlay: "#2b1106",
    openStatus: "#1b8f4a",
    closedStatus: "#8f2430",
    modalBackground: "#fffdf9",
    modalText: "#2b1106",
    footerBackground: "#2a1208",
    footerText: "#fffdf6",
  },
};

export function resolveSemanticTheme(
  templateId: string,
  settings?: AppearanceSettings,
): ResolvedSemanticTheme {
  const base = TEMPLATE_DEFAULT_THEMES[templateId] ?? DEFAULT_THEME_BASE;
  const isDefaultPrimary = settings?.primary === DEFAULT_APPEARANCE.primary;
  const isDefaultAccent = settings?.accent === DEFAULT_APPEARANCE.accent;

  const legacyPrimary =
    settings?.primary &&
    /^#[0-9a-f]{6}$/i.test(settings.primary) &&
    (!isDefaultPrimary || templateId === "signature")
      ? settings.primary
      : undefined;
  const legacyAccent =
    settings?.accent &&
    /^#[0-9a-f]{6}$/i.test(settings.accent) &&
    (!isDefaultAccent || templateId === "signature")
      ? settings.accent
      : undefined;

  const custom = settings?.theme ?? {};

  const resolvedPrimary = custom.primary || legacyPrimary || base.primary;
  const resolvedAccent = custom.accent || legacyAccent || base.accent;

  return {
    primary: resolvedPrimary,
    accent: resolvedAccent,
    pageBackground: custom.pageBackground || base.pageBackground,
    cardBackground: custom.cardBackground || base.cardBackground,
    alternateSurface: custom.alternateSurface || base.alternateSurface,
    text: custom.text || base.text,
    textMuted: custom.textMuted || base.textMuted,
    border: custom.border || base.border,
    navBackground: custom.navBackground || base.navBackground,
    activeCategoryBackground:
      custom.activeCategoryBackground ||
      (custom.primary || legacyPrimary ? resolvedPrimary : base.activeCategoryBackground),
    activeCategoryText:
      custom.activeCategoryText ||
      (custom.activeCategoryBackground || custom.primary || legacyPrimary
        ? readableInk(custom.activeCategoryBackground || resolvedPrimary)
        : base.activeCategoryText),
    buttonBackground:
      custom.buttonBackground ||
      (custom.primary || legacyPrimary ? resolvedPrimary : base.buttonBackground),
    buttonText:
      custom.buttonText ||
      readableInk(custom.buttonBackground || resolvedPrimary),
    priceBackground: custom.priceBackground || base.priceBackground,
    priceText:
      custom.priceText ||
      (custom.primary || legacyPrimary ? resolvedPrimary : base.priceText),
    heroOverlay: custom.heroOverlay || base.heroOverlay,
    openStatus: custom.openStatus || base.openStatus,
    closedStatus: custom.closedStatus || base.closedStatus,
    modalBackground: custom.modalBackground || base.modalBackground,
    modalText: custom.modalText || base.modalText,
    footerBackground: custom.footerBackground || base.footerBackground,
    footerText:
      custom.footerText ||
      readableInk(custom.footerBackground || base.footerBackground),
  };
}

export function semanticThemeToCssVars(theme: ResolvedSemanticTheme): Record<string, string> {
  return {
    "--rt-primary": theme.primary,
    "--rt-accent": theme.accent,
    "--rt-page-bg": theme.pageBackground,
    "--rt-card-bg": theme.cardBackground,
    "--rt-alt-surface": theme.alternateSurface,
    "--rt-text": theme.text,
    "--rt-text-muted": theme.textMuted,
    "--rt-border": theme.border,
    "--rt-nav-bg": theme.navBackground,
    "--rt-active-cat-bg": theme.activeCategoryBackground,
    "--rt-active-cat-text": theme.activeCategoryText,
    "--rt-btn-bg": theme.buttonBackground,
    "--rt-btn-text": theme.buttonText,
    "--rt-price-bg": theme.priceBackground,
    "--rt-price-text": theme.priceText,
    "--rt-hero-overlay": theme.heroOverlay,
    "--rt-open": theme.openStatus,
    "--rt-closed": theme.closedStatus,
    "--rt-modal-bg": theme.modalBackground,
    "--rt-modal-text": theme.modalText,
    "--rt-footer-bg": theme.footerBackground,
    "--rt-footer-text": theme.footerText,
    "--rt-ink": readableInk(theme.primary),
  };
}

export function sameSemanticTheme(a?: SemanticTheme, b?: SemanticTheme): boolean {
  if (a === b) return true;
  const aTheme = a ?? {};
  const bTheme = b ?? {};
  const keys = new Set([...Object.keys(aTheme), ...Object.keys(bTheme)]);
  for (const key of keys) {
    const k = key as keyof SemanticTheme;
    const valA = aTheme[k];
    const valB = bTheme[k];
    if ((valA || undefined) !== (valB || undefined)) {
      return false;
    }
  }
  return true;
}

export function sameAppearance(a: AppearanceSettings, b: AppearanceSettings) {
  return (
    JSON.stringify(resolvedLayout(a)) === JSON.stringify(resolvedLayout(b)) &&
    sameSemanticTheme(a.theme, b.theme) &&
    (Object.keys(DEFAULT_APPEARANCE) as (keyof AppearanceSettings)[]).every((k) => a[k] === b[k])
  );
}

/** Fixed responsive widths only; external legacy URLs are never proxied or transformed. */
export function brandingSrcSet(value: string, preview = false) {
  if (!brandingPath(value)) return undefined;
  const src = brandingUrl(value, preview);
  return [480, 960, 1440].map((width) => `${src}&width=${width} ${width}w`).join(", ");
}
