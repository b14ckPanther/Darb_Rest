"use server";
import { requirePlatform } from "../platform";
import { commercialEditSchema, entitlementEditSchema } from "@darb-rest/validation";
import { revalidatePath } from "next/cache";
export async function saveCommercial(
  locale: string,
  raw: unknown,
  features = false,
): Promise<boolean> {
  const { db } = await requirePlatform(locale);
  if (features) {
    const parsed = entitlementEditSchema.safeParse(raw);
    if (!parsed.success) return false;
    const plan = await db.from("plans").select("code").eq("id", parsed.data.id).single();
    if (plan.error || !["starter", "pro", "business"].includes(plan.data.code)) return false;
    // Branding is intrinsic to every v1 plan; only Business may enable multiple locations.
    if (
      parsed.data.features.some(
        (f) =>
          ["digital_menu", "qr_codes", "custom_branding", "menu_templates"].includes(
            f.feature_key,
          ) && !f.enabled,
      )
    )
      return false;
    if (
      plan.data.code === "starter" &&
      parsed.data.features.some(
        (f) =>
          ["cart", "whatsapp_ordering", "reservation_requests"].includes(f.feature_key) &&
          f.enabled,
      )
    )
      return false;
    if (
      plan.data.code !== "business" &&
      parsed.data.features.some(
        (f) => f.feature_key === "multi_location" && (f.enabled || f.limit_value !== 1),
      )
    )
      return false;
    if (
      plan.data.code === "business" &&
      parsed.data.features.some(
        (f) => f.feature_key === "multi_location" && f.limit_value !== null && f.limit_value < 2,
      )
    )
      return false;
    const r = await db.from("plan_entitlements").upsert(
      parsed.data.features.map((f) => ({ ...f, plan_id: parsed.data.id })),
      { onConflict: "plan_id,feature_key" },
    );
    if (r.error) return false;
  } else {
    const parsed = commercialEditSchema.safeParse(raw);
    if (!parsed.success) return false;
    const { id, ...values } = parsed.data;
    const r = await db
      .from("plans")
      .update(values)
      .eq("id", id)
      .in("code", ["starter", "pro", "business"])
      .select("id")
      .single();
    if (r.error) return false;
  }
  revalidatePath(`/${locale}/platform/plans`);
  return true;
}
