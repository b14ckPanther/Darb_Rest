import { z } from "zod";
import { ORDER_STATUSES } from "@darb-rest/types";
export const cartLineSchema = z
  .object({
    item_id: z.string().uuid(),
    variant_id: z.string().uuid().nullable(),
    modifier_ids: z
      .array(z.string().uuid())
      .max(100)
      .refine((ids) => new Set(ids).size === ids.length),
    quantity: z.number().int().min(1).max(99),
  })
  .strict();
export const orderInputSchema = z
  .object({
    id: z.string().uuid(),
    location_id: z.string().uuid(),
    lines: z.array(cartLineSchema).max(50),
    customer_name: z.string().trim().min(1).max(100),
    customer_phone: z
      .string()
      .trim()
      .max(32)
      .refine((s) => s === "" || /^[+0-9 ()-]{5,32}$/.test(s)),
    fulfillment_mode: z.enum(["dine_in", "takeaway"]),
    expected_subtotal_cents: z.number().int().min(0).max(1000000000),
    revision: z.number().int().nonnegative(),
    submit: z.boolean(),
  })
  .strict()
  .refine((o) => o.fulfillment_mode !== "takeaway" || o.customer_phone.length >= 5)
  .refine((o) => !o.submit || o.lines.length > 0);
export const orderTransitionSchema = z
  .object({
    id: z.string().uuid(),
    revision: z.number().int().positive(),
    status: z.enum(ORDER_STATUSES),
  })
  .strict();
export const ORDER_ERRORS = [
  "invalid_cart",
  "invalid_variant",
  "invalid_modifiers",
  "unavailable",
  "price_changed",
  "forbidden",
  "conflict",
  "order_locked",
  "invalid_transition",
  "rate_limited",
  "save_error",
  "invalid_table",
  "table_conflict",
  "payment_required",
  "payment_conflict",
  "invalid_payment",
] as const;
export function orderError(message?: string): string {
  return ORDER_ERRORS.find((k) => message === k) ?? "save_error";
}
