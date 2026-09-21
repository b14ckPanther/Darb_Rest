import "server-only";
import { cache } from "react";
import { guestDb } from "./guest-orders";
import { V1_FEATURE_FLAGS } from "@darb-rest/types";
export const v1Context = cache(async (businessId: string, locationId: string) => {
  const db = guestDb();
  const [business, location, settings, overrides] = await Promise.all([
    db.from("businesses").select("plan_id").eq("id", businessId).eq("status", "active").single(),
    db
      .from("locations")
      .select("whatsapp_number")
      .eq("id", locationId)
      .eq("business_id", businessId)
      .eq("status", "active")
      .single(),
    db
      .from("business_settings")
      .select("whatsapp_number")
      .eq("business_id", businessId)
      .maybeSingle(),
    db
      .from("business_feature_overrides")
      .select("feature_key,enabled,expires_at")
      .eq("business_id", businessId),
  ]);
  if (business.error || location.error || settings.error || overrides.error)
    throw Error("unavailable");
  const plan = business.data.plan_id
    ? await db
        .from("plans")
        .select("code,is_active,plan_entitlements(feature_key,enabled)")
        .eq("id", business.data.plan_id)
        .single()
    : null;
  const code = plan?.data?.code;
  const flags = new Set<string>();
  if (plan?.data?.is_active && ["starter", "pro", "business"].includes(code ?? "")) {
    for (const e of plan.data.plan_entitlements)
      if (e.enabled && (V1_FEATURE_FLAGS as readonly string[]).includes(e.feature_key))
        flags.add(e.feature_key);
    for (const e of overrides.data ?? [])
      if (
        (V1_FEATURE_FLAGS as readonly string[]).includes(e.feature_key) &&
        (!e.expires_at || new Date(e.expires_at) > new Date())
      ) {
        if (e.enabled) flags.add(e.feature_key);
        else flags.delete(e.feature_key);
      }
  }
  const number =
    (code === "business" && flags.has("multi_location") ? location.data.whatsapp_number : null) ||
    settings.data?.whatsapp_number;
  const destination = number && /^\+[1-9][0-9]{7,14}$/.test(number) ? number : null;
  return {
    multiLocation: code === "business" && flags.has("multi_location"),
    cart:
      !!destination && code !== "starter" && flags.has("cart") && flags.has("whatsapp_ordering"),
    reservation: !!destination && code !== "starter" && flags.has("reservation_requests"),
    destination,
  };
});
