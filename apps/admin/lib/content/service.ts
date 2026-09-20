import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { getServerClient } from "@darb-rest/supabase/server";
import { COOKIE_KEYS } from "@darb-rest/config";
import {
  CONTENT_TABLES,
  type ContentData,
  type TenantRole,
  type ContentLocale,
  type ContentName,
} from "@darb-rest/types";

export const contentContext = cache(async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || url.includes("placeholder") || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    return null;
  const db = await getServerClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return null;
  const { data: memberships, error } = await db
    .from("memberships")
    .select("business_id,role")
    .eq("user_id", user.id)
    .eq("status", "active");
  if (error) throw error;
  if (!memberships?.length) return null;
  const selected = (await cookies()).get(COOKIE_KEYS.ACTIVE_BUSINESS)?.value;
  const membership = memberships.find((m) => m.business_id === selected) ?? memberships[0]!;
  const [b, l, settings] = await Promise.all([
    db
      .from("businesses")
      .select("id,name,slug,currency,default_locale")
      .eq("id", membership.business_id)
      .single(),
    db.from("locations").select("id,name,slug").eq("business_id", membership.business_id),
    db
      .from("business_settings")
      .select("logo_url,primary_color,accent_color")
      .eq("business_id", membership.business_id)
      .maybeSingle(),
  ]);
  if (b.error || l.error || settings.error) throw b.error ?? l.error ?? settings.error;
  return {
    db,
    user,
    business: {
      ...b.data!,
      name: b.data!.name as ContentName,
      default_locale: b.data!.default_locale as ContentLocale,
    },
    locations: (l.data ?? []).map((v) => ({ ...v, name: v.name as ContentName })),
    role: membership.role as TenantRole,
    branding: settings.data,
  };
});
export const loadContent = cache(async () => {
  const ctx = await contentContext();
  if (!ctx) return null;
  const results = await Promise.all(
    CONTENT_TABLES.map(async (table) => {
      // PostgREST caps responses; paginate explicitly so large menus never truncate silently.
      const rows: unknown[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error, count } = await ctx.db
          .from(table)
          .select("*", { count: "exact" })
          .eq("business_id", ctx.business.id)
          .order("sort_order")
          .order("id")
          .range(offset, offset + 999);
        if (error) throw error;
        if ((count ?? 0) > 5000) throw Error("Content result limit reached");
        rows.push(...data);
        if (rows.length >= (count ?? 0)) break;
        if (!data.length) throw Error("Incomplete content response");
      }
      return [table, rows] as const;
    }),
  );
  const content = Object.fromEntries(results) as unknown as ContentData;
  const paths = content.menu_items.flatMap((i) => (i.image_path ? [i.image_path] : []));
  const signed = paths.length
    ? await ctx.db.storage.from("menu-media").createSignedUrls(paths, 3600)
    : null;
  if (signed?.error) throw signed.error;
  const images = Object.fromEntries(
    (signed?.data ?? []).filter((x) => x.path && x.signedUrl).map((x) => [x.path!, x.signedUrl!]),
  );
  return {
    content,
    images,
    business: ctx.business,
    locations: ctx.locations,
    role: ctx.role,
    branding: ctx.branding,
  };
});
