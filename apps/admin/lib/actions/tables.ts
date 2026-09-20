"use server";
import { tableInputSchema } from "@darb-rest/validation";
import { canManageTables } from "@darb-rest/types";
import { contentContext } from "../content/service";
export async function manageTable(raw: unknown) {
  try {
    const parsed = tableInputSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: "invalid_table" };
    const ctx = await contentContext();
    if (!ctx || !canManageTables(ctx.role)) return { ok: false, error: "forbidden" };
    const t = parsed.data;
    const { error } = await ctx.db.rpc("manage_restaurant_table", {
      p_id: t.id,
      p_business_id: ctx.business.id,
      p_location_id: t.location_id,
      p_revision: t.revision,
      p_action: t.action,
      p_name: t.name,
      p_area: t.area,
      p_active: t.is_active,
    });
    return error
      ? {
          ok: false,
          error:
            error.code === "23505"
              ? "duplicate"
              : error.message === "conflict"
                ? "conflict"
                : "saveError",
        }
      : { ok: true };
  } catch {
    return { ok: false, error: "saveError" };
  }
}
