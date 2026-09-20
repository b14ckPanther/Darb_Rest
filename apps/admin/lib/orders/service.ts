import "server-only";
import { cache } from "react";
import { contentContext } from "../content/service";
export const loadOrderDetail = cache(async (id: string) => {
  if (!/^[a-f0-9-]{36}$/.test(id)) return null;
  const ctx = await contentContext();
  if (!ctx) return null;
  const [order, items, modifiers, payment] = await Promise.all([
    ctx.db
      .from("orders")
      .select(
        "id,business_id,location_id,status,fulfillment_mode,customer_name,customer_phone,currency,subtotal_cents,revision,created_at,updated_at,cart,table_id,table_name,table_area",
      )
      .eq("business_id", ctx.business.id)
      .eq("id", id)
      .maybeSingle(),
    ctx.db
      .from("order_items")
      .select("*")
      .eq("business_id", ctx.business.id)
      .eq("order_id", id)
      .order("sort_order"),
    (async () => {
      const query = () =>
        ctx.db
          .from("order_item_modifiers")
          .select("*", { count: "exact" })
          .eq("business_id", ctx.business.id)
          .eq("order_id", id)
          .order("id");
      const first = await query().range(0, 999);
      if (first.error) throw first.error;
      const rows = [...first.data];
      for (let offset = 1000; offset < (first.count ?? 0); offset += 1000) {
        const page = await query().range(offset, offset + 999);
        if (page.error) throw page.error;
        rows.push(...page.data);
      }
      return { data: rows, error: null };
    })(),
    ctx.db
      .from("payments")
      .select("id,method,status,amount_cents,currency,reference,revision")
      .eq("business_id", ctx.business.id)
      .eq("order_id", id)
      .maybeSingle(),
  ]);
  if (order.error || items.error || modifiers.error || payment.error)
    throw order.error ?? items.error ?? modifiers.error ?? payment.error;
  if (!order.data) return null;
  return {
    order: order.data,
    payment: payment.data,
    items: items.data!,
    modifiers: modifiers.data!,
    role: ctx.role,
    locations: ctx.locations,
  };
});
