"use server";
import { canManageOrders, type KitchenFeed } from "@darb-rest/types";
import { kitchenQuerySchema, kitchenActionSchema, orderError } from "@darb-rest/validation";
import { contentContext } from "../content/service";
export async function fetchKitchen(
  raw: unknown,
): Promise<{ ok: true; feed: KitchenFeed } | { ok: false; error: string }> {
  try {
    const q = kitchenQuerySchema.safeParse(raw);
    if (!q.success) return { ok: false, error: "forbidden" };
    const ctx = await contentContext();
    if (
      !ctx ||
      !canManageOrders(ctx.role) ||
      !ctx.locations.some((l) => l.id === q.data.location_id)
    )
      return { ok: false, error: "forbidden" };
    const { data, error } = await ctx.db.rpc("kitchen_orders", {
      p_business_id: ctx.business.id,
      p_location_id: q.data.location_id,
      p_status: q.data.status,
      p_offset: q.data.offset,
    });
    if (error) return { ok: false, error: orderError(error.message) };
    return { ok: true, feed: data as unknown as KitchenFeed };
  } catch {
    return { ok: false, error: "save_error" };
  }
}
export async function operateKitchen(raw: unknown) {
  try {
    const q = kitchenActionSchema.safeParse(raw);
    if (!q.success) return { ok: false, error: "invalid_transition" };
    const ctx = await contentContext();
    if (
      !ctx ||
      !canManageOrders(ctx.role) ||
      !ctx.locations.some((l) => l.id === q.data.location_id)
    )
      return { ok: false, error: "forbidden" };
    const v = q.data;
    const { error } = await ctx.db.rpc("operate_kitchen_order", {
      p_business_id: ctx.business.id,
      p_location_id: v.location_id,
      p_order_id: v.id,
      p_action_id: v.action_id,
      p_revision: v.revision,
      p_status: v.status,
      p_reason: v.reason,
    });
    return error ? { ok: false, error: orderError(error.message) } : { ok: true };
  } catch {
    return { ok: false, error: "save_error" };
  }
}
