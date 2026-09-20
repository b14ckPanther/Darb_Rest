import { canManageMenu, type TenantRole } from "./roles";
export type ContentLocale = "ar" | "he" | "en";
export type ContentName = Partial<Record<ContentLocale, string>>;
export const DIETARY_TAGS = [
  "vegetarian",
  "vegan",
  "gluten_free",
  "spicy",
  "halal",
  "kosher",
] as const;
export const ALLERGENS = [
  "gluten",
  "milk",
  "eggs",
  "peanuts",
  "tree_nuts",
  "soy",
  "sesame",
  "fish",
  "shellfish",
  "mustard",
] as const;
export const CONTENT_TABLES = [
  "menus",
  "menu_locations",
  "menu_sections",
  "menu_items",
  "item_variants",
  "modifier_groups",
  "modifiers",
  "item_modifier_groups",
  "item_dietary_tags",
  "item_allergens",
  "menu_item_location_overrides",
] as const;
export type ContentTable = (typeof CONTENT_TABLES)[number];
export interface ContentEntity {
  id: string;
  business_id: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
export interface Menu extends ContentEntity {
  name_i18n: ContentName;
  description_i18n: ContentName;
  status: "draft" | "active" | "archived";
  is_default: boolean;
  archived_at: string | null;
}
export interface MenuLocation extends ContentEntity {
  menu_id: string;
  location_id: string;
  is_enabled: boolean;
}
export interface MenuSection extends ContentEntity {
  menu_id: string;
  name_i18n: ContentName;
  description_i18n: ContentName;
  is_visible: boolean;
}
export interface MenuItem extends ContentEntity {
  section_id: string;
  name_i18n: ContentName;
  description_i18n: ContentName;
  base_price: number;
  currency: string;
  sku: string | null;
  image_path: string | null;
  is_visible: boolean;
  is_available: boolean;
  archived_at: string | null;
}
export interface ItemVariant extends ContentEntity {
  item_id: string;
  name_i18n: ContentName;
  price: number;
  is_available: boolean;
}
export interface ModifierGroup extends ContentEntity {
  name_i18n: ContentName;
  min_select: number;
  max_select: number;
  is_required: boolean;
}
export interface Modifier extends ContentEntity {
  modifier_group_id: string;
  name_i18n: ContentName;
  price_delta: number;
  is_available: boolean;
}
export interface ItemModifierGroup extends ContentEntity {
  item_id: string;
  modifier_group_id: string;
}
export interface DietaryTag extends ContentEntity {
  item_id: string;
  code: (typeof DIETARY_TAGS)[number];
}
export interface Allergen extends ContentEntity {
  item_id: string;
  code: (typeof ALLERGENS)[number];
}
export interface ItemLocationOverride extends ContentEntity {
  item_id: string;
  location_id: string;
  is_visible_override: boolean | null;
  is_available_override: boolean | null;
  price_override: number | null;
}
export interface ContentData {
  menus: Menu[];
  menu_locations: MenuLocation[];
  menu_sections: MenuSection[];
  menu_items: MenuItem[];
  item_variants: ItemVariant[];
  modifier_groups: ModifierGroup[];
  modifiers: Modifier[];
  item_modifier_groups: ItemModifierGroup[];
  item_dietary_tags: DietaryTag[];
  item_allergens: Allergen[];
  menu_item_location_overrides: ItemLocationOverride[];
}
export const canEditMenuContent = canManageMenu;
export const canManageAvailability = (role: TenantRole) => canManageMenu(role) || role === "staff";
export function localizedContent(
  value: ContentName,
  locale: ContentLocale,
): { text: string; lang: ContentLocale } {
  const lang =
    ([locale, "ar", "he", "en"] as ContentLocale[]).find((l) => value[l]?.trim()) ?? locale;
  return { text: value[lang] ?? "", lang };
}
export function sortContent<T extends { sort_order: number; id: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id));
}
export function resolveItem(item: MenuItem, override?: ItemLocationOverride) {
  return {
    ...item,
    is_visible: override?.is_visible_override ?? item.is_visible,
    is_available: override?.is_available_override ?? item.is_available,
    base_price: override?.price_override ?? item.base_price,
  };
}
export function startingPrice(item: MenuItem, variants: ItemVariant[]) {
  const available = variants.filter((v) => v.is_available);
  return available.length ? Math.min(...available.map((v) => v.price)) : item.base_price;
}
export function formatMenuPrice(value: number, currency: string, locale: string) {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(value);
}
