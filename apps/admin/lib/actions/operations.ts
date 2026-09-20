"use server";
import { canManageOrders, type KitchenFeed, type OperationsContext } from "@darb-rest/types";
import { restaurantActionSchema, restaurantQuerySchema, orderError } from "@darb-rest/validation";
import { contentContext } from "../content/service";
export async function fetchOperations(
  location: string,
  offset = 0,
): Promise<{ ok: true; context: OperationsContext } | { ok: false; error: string }> {
  try {
    if (
      !/^[a-f0-9-]{36}$/.test(location) ||
      !Number.isInteger(offset) ||
      offset < 0 ||
      offset > 100000
    )
      return { ok: false, error: "forbidden" };
    const ctx = await contentContext();
    if (!ctx || !canManageOrders(ctx.role) || !ctx.locations.some((l) => l.id === location))
      return { ok: false, error: "forbidden" };
    const { data, error } = await ctx.db.rpc("restaurant_operations_context", {
      p_business_id: ctx.business.id,
      p_location_id: location,
      p_history_offset: offset,
    });
    return error
      ? { ok: false, error: orderError(error.message) }
      : { ok: true, context: data as unknown as OperationsContext };
  } catch {
    return { ok: false, error: "save_error" };
  }
}
export async function fetchStationKitchen(
  raw: unknown,
): Promise<{ ok: true; feed: KitchenFeed } | { ok: false; error: string }> {
  try {
    const parsed = restaurantQuerySchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "forbidden" };
    const ctx = await contentContext();
    const q = parsed.data;
    if (!ctx || !canManageOrders(ctx.role) || !ctx.locations.some((l) => l.id === q.location_id))
      return { ok: false, error: "forbidden" };
    const { data, error } = await ctx.db.rpc("restaurant_orders", {
      p_business_id: ctx.business.id,
      p_location_id: q.location_id,
      p_status: q.status,
      p_offset: q.offset,
      ...(q.station_id ? { p_station: q.station_id } : {}),
      p_unassigned: q.unassigned,
      p_mine: q.mine,
    });
    return error
      ? { ok: false, error: orderError(error.message) }
      : { ok: true, feed: data as unknown as KitchenFeed };
  } catch {
    return { ok: false, error: "save_error" };
  }
}
export async function changeRestaurantOperation(raw: unknown) {
  try {
    const q = restaurantActionSchema.safeParse(raw);
    if (!q.success) return { ok: false, error: "invalid_transition" };
    const ctx = await contentContext();
    if (
      !ctx ||
      !canManageOrders(ctx.role) ||
      !ctx.locations.some((l) => l.id === q.data.location_id)
    )
      return { ok: false, error: "forbidden" };
    const { error } = await ctx.db.rpc("restaurant_operation", {
      p_action_id: q.data.action_id,
      p_business_id: ctx.business.id,
      p_location_id: q.data.location_id,
      p_action: q.data.action,
      p_payload: q.data.payload,
    });
    return error ? { ok: false, error: orderError(error.message) } : { ok: true };
  } catch {
    return { ok: false, error: "save_error" };
  }
}
