import "server-only";
import { assertPublicBusiness } from "./launch";
import { cache } from "react";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { getAdminClient } from "@darb-rest/supabase/admin";
import type { ContentData, ContentName, OrderSummary } from "@darb-rest/types";
export const GUEST_COOKIE = "darb_guest_session";
export const guestDb = (): ReturnType<typeof getAdminClient> => {
  if (
    !process.env.SUPABASE_SERVICE_ROLE_KEY ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")
  )
    throw Error("Guest ordering is not configured");
  return getAdminClient();
};
export const loadPublicMenu = cache(async (businessSlug: string, locationSlug: string) => {
  if (!(await assertPublicBusiness(businessSlug))) return null;
  const db = guestDb();
  const { data, error } = await db.rpc("public_order_menu", {
    p_business_slug: businessSlug,
    p_location_slug: locationSlug,
  });
  if (error) throw error;
  if (!data) return null;
  const loaded = data as unknown as {
    business: { id: string; name: ContentName; currency: string; slug: string };
    locations: { id: string; name: ContentName; slug: string }[];
    branding: {
      logo_url: string | null;
      primary_color: string | null;
      accent_color: string | null;
    } | null;
    content: ContentData;
  };
  const images = Object.fromEntries(
    loaded.content.menu_items
      .filter((i) => i.image_path)
      .map((i) => [
        i.image_path!,
        `/menu-image?${new URLSearchParams({ business: businessSlug, branch: locationSlug, item: i.id })}`,
      ]),
  );
  return { ...loaded, images };
});
export async function loadGuestDraft(
  businessId: string,
  locationId: string,
  orderId?: string,
  tableId?: string,
) {
  const token = (await cookies()).get(GUEST_COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  let query = guestDb()
    .from("orders")
    .select(
      "id,business_id,location_id,status,fulfillment_mode,customer_name,customer_phone,currency,subtotal_cents,revision,created_at,updated_at,cart,table_id,table_name,table_area",
    )
    .eq("guest_token_hash", createHash("sha256").update(token).digest("hex"))
    .eq("business_id", businessId)
    .eq("location_id", locationId);
  query = orderId ? query.eq("id", orderId) : query.eq("status", "draft");
  if (!orderId)
    query = tableId
      ? query.or(`table_id.eq.${tableId},and(table_id.is.null,fulfillment_mode.eq.takeaway)`)
      : query.is("table_id", null);
  const { data, error } = await query
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as OrderSummary | null;
}
