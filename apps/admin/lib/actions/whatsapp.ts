"use server";
import { resolveTenantContext } from "../tenant-resolver";
import { getServerClient } from "@darb-rest/supabase/server";
export async function saveWhatsapp(locationId: string | null, value: string): Promise<boolean> {
  const context = await resolveTenantContext();
  if (
    !context?.activeBusiness ||
    !["owner", "admin", "manager"].includes(context.activeMembership?.role ?? "")
  )
    return false;
  const number = value.trim() || null;
  if (number && !/^\+[1-9][0-9]{7,14}$/.test(number)) return false;
  const db = await getServerClient();
  if (locationId) {
    const business = await db
      .from("businesses")
      .select("plans(code)")
      .eq("id", context.activeBusiness.id)
      .single();
    if (
      business.error ||
      business.data.plans?.code !== "business" ||
      !context.entitlements.multi_location.enabled
    )
      return false;
    const r = await db
      .from("locations")
      .update({ whatsapp_number: number })
      .eq("business_id", context.activeBusiness.id)
      .eq("id", locationId)
      .select("id")
      .single();
    return !r.error;
  }
  const r = await db
    .from("business_settings")
    .upsert(
      { business_id: context.activeBusiness.id, whatsapp_number: number },
      { onConflict: "business_id" },
    );
  return !r.error;
}
