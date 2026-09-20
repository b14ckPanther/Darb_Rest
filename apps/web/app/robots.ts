import type { MetadataRoute } from "next";
import { publicOrigin } from "@darb-rest/config";
import { requestTenant, canonicalOrigin } from "../lib/launch";
import { loadRestaurant } from "../lib/restaurant";
export const dynamic = "force-dynamic";
export default async function robots(): Promise<MetadataRoute.Robots> {
  const tenant = await requestTenant();
  const restaurant = tenant ? await loadRestaurant(tenant) : null;
  const origin = restaurant
    ? (await canonicalOrigin(restaurant.business.id)).origin
    : publicOrigin();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/*/order/", "/*/q/", "/*?*order=", "/*?*table="],
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}
