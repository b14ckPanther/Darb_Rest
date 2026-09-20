"use server";
import { revalidatePath } from "next/cache";
import { contentBatchSchema } from "@darb-rest/validation";
import { canEditMenuContent, canManageAvailability } from "@darb-rest/types";
import { contentContext } from "../content/service";
export async function saveContent(raw: unknown) {
  try {
    const parsed = contentBatchSchema.safeParse(raw);
    if (!parsed.success) return { ok: false as const, error: "invalid" };
    const ctx = await contentContext();
    if (!ctx || !canEditMenuContent(ctx.role)) return { ok: false as const, error: "forbidden" };
    const { error } = await ctx.db.rpc("save_menu_content", {
      p_business_id: ctx.business.id,
      p_operations: JSON.parse(JSON.stringify(parsed.data)),
    });
    if (error) {
      console.error("Content save failed", { code: error.code });
      return { ok: false as const, error: "saveError" };
    }
    revalidatePath("/[locale]/menus", "layout");
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "saveError" };
  }
}
export async function setAvailability(itemId: string, available: boolean) {
  try {
    const ctx = await contentContext();
    if (!ctx || !canManageAvailability(ctx.role)) return { ok: false };
    const { data: item } = await ctx.db
      .from("menu_items")
      .select("id")
      .eq("business_id", ctx.business.id)
      .eq("id", itemId)
      .single();
    if (!item) return { ok: false };
    const { error } = await ctx.db.rpc("set_menu_item_availability", {
      p_item_id: itemId,
      p_available: available,
    });
    if (error) return { ok: false };
    revalidatePath("/[locale]/menus", "layout");
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
