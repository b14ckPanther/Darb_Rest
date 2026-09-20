import "server-only";
import { cache } from "react";
import {
  DEFAULT_APPEARANCE,
  supportedAppearance,
  safePublicUrl,
  type AppearanceSettings,
  type RestaurantProfile,
  type ContentName,
} from "@darb-rest/types";
import { appearanceSchema } from "@darb-rest/validation";
import { guestDb } from "./guest-orders";
export const loadRestaurant = cache(async (slug: string, branchSlug?: string) => {
  const db = guestDb();
  const { data: business, error } = await db
    .from("businesses")
    .select("id,slug,name,timezone,default_locale")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw error;
  if (!business) return null;
  const [branches, branding, appearance] = await Promise.all([
    db
      .from("locations")
      .select("id,slug,name,address_line1,city,country,phone,timezone,is_primary")
      .eq("business_id", business.id)
      .eq("status", "active")
      .order("is_primary", { ascending: false })
      .order("created_at")
      .order("id"),
    db
      .from("business_settings")
      .select(
        "logo_url,cover_url,cover_video_url,primary_color,accent_color,phone_public,website_url,instagram_url,facebook_url",
      )
      .eq("business_id", business.id)
      .maybeSingle(),
    db
      .from("restaurant_appearance")
      .select("published")
      .eq("business_id", business.id)
      .maybeSingle(),
  ]);
  if (branches.error || branding.error) throw branches.error ?? branding.error;
  // Safe default while the operator prepares migration 10; never read draft for public rendering.
  if (appearance.error && !["42P01", "PGRST205"].includes(appearance.error.code))
    throw appearance.error;
  const branch = branchSlug
    ? branches.data?.find((b) => b.slug === branchSlug)
    : branches.data?.[0];
  if (!branch) return null;
  const hours = await db
    .from("location_operating_hours")
    .select("day_of_week,open_time,close_time,is_closed")
    .eq("location_id", branch.id)
    .order("day_of_week")
    .order("open_time");
  if (hours.error) throw hours.error;
  const b = branding.data;
  const parsed = appearanceSchema.safeParse(appearance.data?.published);
  const settings: AppearanceSettings =
    parsed.success && supportedAppearance(parsed.data)
      ? parsed.data
      : {
          ...DEFAULT_APPEARANCE,
          logo: safePublicUrl(b?.logo_url),
          cover: safePublicUrl(b?.cover_url),
          coverVideo: safePublicUrl(b?.cover_video_url),
          ...(/^#[0-9a-f]{6}$/i.test(b?.primary_color ?? "") ? { primary: b!.primary_color! } : {}),
          ...(/^#[0-9a-f]{6}$/i.test(b?.accent_color ?? "") ? { accent: b!.accent_color! } : {}),
        };
  const profile: RestaurantProfile = {
    timezone: branch.timezone ?? business.timezone,
    address: [branch.address_line1, branch.city, branch.country].filter(Boolean).join(", "),
    phone: branch.phone ?? b?.phone_public ?? "",
    website: safePublicUrl(b?.website_url),
    instagram: safePublicUrl(b?.instagram_url),
    facebook: safePublicUrl(b?.facebook_url),
    hours: hours.data ?? [],
  };
  return {
    settings,
    profile,
    branch: { id: branch.id, slug: branch.slug, name: branch.name as ContentName },
    branches: (branches.data ?? []).map((b) => ({
      id: b.id,
      slug: b.slug,
      name: b.name as ContentName,
    })),
    business: { ...business, name: business.name as ContentName },
  };
});
