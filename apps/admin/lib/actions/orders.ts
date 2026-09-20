"use server";
import { revalidatePath } from "next/cache";
import { orderInputSchema, orderTransitionSchema, orderError } from "@darb-rest/validation";
import {
  canPlaceOrder,
  canManageOrders,
  type OrderResult,
  type OrderSummary,
} from "@darb-rest/types";
import { contentContext } from "../content/service";
export async function saveOwnerOrder(raw: unknown): Promise<OrderResult> {
  try {
    const parsed = orderInputSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "invalid_cart" };
    const ctx = await contentContext();
    if (!ctx || !canPlaceOrder(ctx.role)) return { ok: false, error: "forbidden" };
    const c = parsed.data;
    const { data, error } = await ctx.db.rpc("save_order", {
      p_id: c.id,
      p_business_id: ctx.business.id,
      p_location_id: c.location_id,
      p_lines: c.lines,
      p_customer_name: c.customer_name,
      p_customer_phone: c.customer_phone,
      p_fulfillment_mode: c.fulfillment_mode,
      p_expected_subtotal_cents: c.expected_subtotal_cents,
      p_revision: c.revision,
      p_submit: c.submit,
    });
    if (error) return { ok: false, error: orderError(error.message) };
    return { ok: true, order: data as unknown as OrderSummary };
  } catch {
    return { ok: false, error: "save_error" };
  }
}
export async function changeOrderStatus(raw: unknown) {
  try {
    const parsed = orderTransitionSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "invalid_transition" };
    const ctx = await contentContext();
    if (!ctx || !canManageOrders(ctx.role)) return { ok: false, error: "forbidden" };
    const { error } = await ctx.db.rpc("transition_order", {
      p_id: parsed.data.id,
      p_business_id: ctx.business.id,
      p_revision: parsed.data.revision,
      p_status: parsed.data.status,
    });
    if (error) return { ok: false, error: orderError(error.message) };
    revalidatePath("/[locale]/orders", "layout");
    return { ok: true };
  } catch {
    return { ok: false, error: "save_error" };
  }
}

export async function recordRestaurantPayment(id: string, revision: number) {
  if (!/^[a-f0-9-]{36}$/.test(id) || !Number.isInteger(revision) || revision < 1) return false;
  const ctx = await contentContext();
  if (!ctx || !canManageOrders(ctx.role)) return false;
  const { error } = await ctx.db.rpc("record_restaurant_payment", {
    p_id: id,
    p_business_id: ctx.business.id,
    p_revision: revision,
  });
  return !error;
}
