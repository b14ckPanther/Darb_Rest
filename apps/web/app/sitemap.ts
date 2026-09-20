import { headers } from "next/headers";
import type { MetadataRoute } from "next";
import { getAdminClient } from "@darb-rest/supabase/admin";
import { restaurantCanonical } from "@darb-rest/types";
import { publicOrigin } from "@darb-rest/config";
import { requestTenant } from "../lib/launch";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const incoming = (await headers()).get("host");
  const tenant = await requestTenant();
  const db = getAdminClient();
  const out: MetadataRoute.Sitemap = [];
  for (let offset = 0; offset <= 50000; offset += 500) {
    const { data, error } = await db.rpc("restaurant_sitemap", {
      ...(tenant ? { p_slug: tenant } : {}),
      p_offset: offset,
    });
    if (error) throw error;
    const rows = data as unknown as {
      slug: string;
      branch: string;
      canonical_host: string | null;
    }[];
    for (const row of rows) {
      if ((!tenant && row.canonical_host) || (tenant && row.canonical_host !== incoming)) continue;
      const origin = row.canonical_host ? `https://${row.canonical_host}` : publicOrigin();
      for (const locale of ["ar", "he", "en"])
        out.push({
          url: restaurantCanonical(origin, row.slug, locale, row.branch, !!row.canonical_host),
        });
    }
    if (out.length > 49000) throw Error("sitemap_partition_required");
    if (rows.length < 500) return out;
  }
  throw Error("sitemap_partition_required");
}
