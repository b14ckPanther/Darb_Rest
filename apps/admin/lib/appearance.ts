import "server-only";
import { cache } from "react";
import {
  canManageBranding,
  DEFAULT_APPEARANCE,
  safePublicUrl,
  type AppearanceSettings,
  type RestaurantProfile,
} from "@darb-rest/types";
import { appearanceSchema } from "@darb-rest/validation";
import { contentContext, loadContent } from "./content/service";
export const loadAppearance = cache(async () => {
  const ctx = await contentContext();
  if (!ctx || !canManageBranding(ctx.role)) return null;
  const [content, record, business, settings, branches] = await Promise.all([
    loadContent(),
    ctx.db
      .from("restaurant_appearance")
      .select("draft,published,revision")
      .eq("business_id", ctx.business.id)
      .maybeSingle(),
    ctx.db.from("businesses").select("timezone").eq("id", ctx.business.id).single(),
    ctx.db
      .from("business_settings")
      .select(
        "logo_url,cover_url,cover_video_url,primary_color,accent_color,phone_public,website_url,instagram_url,facebook_url",
      )
      .eq("business_id", ctx.business.id)
      .maybeSingle(),
    ctx.db
      .from("locations")
      .select("id,slug,name,timezone,address_line1,city,country,phone")
      .eq("business_id", ctx.business.id)
      .eq("status", "active")
      .order("created_at"),
  ]);
  if (!content) return null;
  if (record.error && !["42P01", "PGRST205"].includes(record.error.code)) throw record.error;
  if (business.error || settings.error || branches.error)
    throw business.error ?? settings.error ?? branches.error;
  const ids = branches.data.map((b) => b.id);
  const hours = ids.length
    ? await ctx.db
        .from("location_operating_hours")
        .select("location_id,day_of_week,open_time,close_time,is_closed")
        .in("location_id", ids)
    : { data: [], error: null };
  if (hours.error) throw hours.error;
  const b = settings.data;
  const fallback: AppearanceSettings = {
    ...DEFAULT_APPEARANCE,
    logo: safePublicUrl(b?.logo_url),
    cover: safePublicUrl(b?.cover_url),
    coverVideo: safePublicUrl(b?.cover_video_url),
    primary: /^#[0-9a-f]{6}$/i.test(b?.primary_color ?? "")
      ? b!.primary_color!
      : DEFAULT_APPEARANCE.primary,
    accent: /^#[0-9a-f]{6}$/i.test(b?.accent_color ?? "")
      ? b!.accent_color!
      : DEFAULT_APPEARANCE.accent,
  };
  const parsed = appearanceSchema.safeParse(record.data?.draft);
  const profiles: Record<string, RestaurantProfile> = Object.fromEntries(
    branches.data.map((l) => [
      l.id,
      {
        timezone: l.timezone ?? business.data.timezone,
        address: [l.address_line1, l.city, l.country].join(", "),
        phone: l.phone ?? b?.phone_public ?? "",
        website: safePublicUrl(b?.website_url),
        instagram: safePublicUrl(b?.instagram_url),
        facebook: safePublicUrl(b?.facebook_url),
        hours: (hours.data ?? []).filter((h) => h.location_id === l.id),
      },
    ]),
  );
  return {
    ...content,
    locations: content.locations.filter((l) => ids.includes(l.id)),
    profiles,
    settings: parsed.success ? parsed.data : fallback,
    published: appearanceSchema.safeParse(record.data?.published).success
      ? appearanceSchema.parse(record.data!.published)
      : fallback,
    revision: record.data?.revision ?? 0,
    persistenceReady: !record.error,
  };
});
