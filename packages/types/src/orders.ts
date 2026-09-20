import { resolveItem, type ContentData, type ContentName } from "./content";
import type { TenantRole } from "./roles";
export const ORDER_STATUSES = [
  "draft",
  "submitted",
  "accepted",
  "preparing",
  "ready",
  "completed",
  "cancelled",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type FulfillmentMode = "dine_in" | "takeaway";
export interface CartLine {
  item_id: string;
  variant_id: string | null;
  modifier_ids: string[];
  quantity: number;
}
export interface OrderInput {
  id: string;
  location_id: string;
  lines: CartLine[];
  customer_name: string;
  customer_phone: string;
  fulfillment_mode: FulfillmentMode;
  expected_subtotal_cents: number;
  revision: number;
  submit: boolean;
}
export interface OrderSummary {
  table_id?: string | null;
  table_name?: string | null;
  table_area?: string | null;
  id: string;
  business_id: string;
  location_id: string;
  status: OrderStatus;
  fulfillment_mode: FulfillmentMode;
  customer_name: string;
  customer_phone: string;
  currency: string;
  subtotal_cents: number;
  revision: number;
  created_at: string;
  updated_at: string;
  cart: CartLine[];
}
export interface PaymentSummary {
  id: string;
  method: "restaurant" | "online";
  status: "pending" | "authorized" | "paid" | "failed" | "cancelled" | "refunded";
  amount_cents: number;
  currency: string;
  reference: string;
}
export type OrderResult =
  | { ok: true; order: OrderSummary; payment?: PaymentSummary; redirectUrl?: string }
  | { ok: false; error: string };
export interface PricedLine {
  name: ContentName;
  variantName?: ContentName;
  modifiers: { id: string; name: ContentName; cents: number }[];
  unitCents: number;
  totalCents: number;
  currency: string;
}
export const canPlaceOrder = (role: TenantRole) => role !== "read_only";
export const nextOrderStatuses: Record<OrderStatus, OrderStatus[]> = {
  draft: [],
  submitted: ["accepted", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};
export function moneyCents(value: number) {
  const cents = Math.round(value * 100);
  if (!Number.isSafeInteger(cents) || cents < 0) throw Error("invalid_cart");
  return cents;
}
/** Client estimate only. The database independently validates and reprices every save/submit. */
export function priceCartLine(data: ContentData, location: string, line: CartLine): PricedLine {
  if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 99)
    throw Error("invalid_cart");
  const base = data.menu_items.find((i) => i.id === line.item_id);
  const section = data.menu_sections.find((s) => s.id === base?.section_id);
  const menu = data.menus.find((m) => m.id === section?.menu_id);
  if (
    !base ||
    base.archived_at ||
    !section?.is_visible ||
    menu?.status !== "active" ||
    menu.archived_at ||
    !data.menu_locations.some(
      (a) => a.menu_id === menu.id && a.location_id === location && a.is_enabled,
    )
  )
    throw Error("unavailable");
  const item = resolveItem(
    base,
    data.menu_item_location_overrides.find(
      (o) => o.item_id === base.id && o.location_id === location,
    ),
  );
  if (!item.is_visible || !item.is_available) throw Error("unavailable");
  const variants = data.item_variants.filter((v) => v.item_id === item.id);
  const variant = variants.find((v) => v.id === line.variant_id && v.is_available);
  if ((variants.length && !variant) || (!variants.length && line.variant_id))
    throw Error("invalid_variant");
  const groupIds = data.item_modifier_groups
    .filter((g) => g.item_id === item.id)
    .map((g) => g.modifier_group_id);
  const groups = data.modifier_groups.filter((g) => groupIds.includes(g.id));
  if (new Set(line.modifier_ids).size !== line.modifier_ids.length)
    throw Error("invalid_modifiers");
  const modifiers = line.modifier_ids.map((id) => {
    const m = data.modifiers.find(
      (m) => m.id === id && m.is_available && groupIds.includes(m.modifier_group_id),
    );
    if (!m) throw Error("invalid_modifiers");
    return m;
  });
  for (const g of groups) {
    const count = modifiers.filter((m) => m.modifier_group_id === g.id).length;
    if (count < g.min_select || count > g.max_select || (g.is_required && !count))
      throw Error("invalid_modifiers");
  }
  const unitCents =
    moneyCents(variant?.price ?? item.base_price) +
    modifiers.reduce((n, m) => n + moneyCents(m.price_delta), 0);
  const totalCents = unitCents * line.quantity;
  if (!Number.isSafeInteger(totalCents) || totalCents > 1000000000) throw Error("invalid_cart");
  return {
    name: item.name_i18n,
    variantName: variant?.name_i18n,
    modifiers: modifiers.map((m) => ({
      id: m.id,
      name: m.name_i18n,
      cents: moneyCents(m.price_delta),
    })),
    unitCents,
    totalCents,
    currency: item.currency,
  };
}
export function cartSubtotal(data: ContentData, location: string, lines: CartLine[]) {
  if (lines.length > 50) throw Error("invalid_cart");
  const priced = lines.map((line) => priceCartLine(data, location, line));
  if (new Set(priced.map((p) => p.currency)).size > 1) throw Error("invalid_cart");
  const subtotal = priced.reduce((n, p) => n + p.totalCents, 0);
  if (subtotal > 1000000000) throw Error("invalid_cart");
  return subtotal;
}
export function addCartLine(lines: CartLine[], line: CartLine) {
  const same = (a: CartLine) =>
    a.item_id === line.item_id &&
    a.variant_id === line.variant_id &&
    [...a.modifier_ids].sort().join(",") === [...line.modifier_ids].sort().join(",");
  const index = lines.findIndex(same);
  if (index < 0) {
    if (lines.length >= 50) throw Error("invalid_cart");
    return [...lines, line];
  }
  return lines.map((l, i) => {
    if (i !== index) return l;
    const quantity = l.quantity + line.quantity;
    if (quantity > 99) throw Error("invalid_cart");
    return { ...l, quantity };
  });
}
