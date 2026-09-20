import { jsonLd } from "@darb-rest/types";
import { restaurantSeo } from "../../../lib/seo";
import { notFound } from "next/navigation";
import { isValidLocale } from "@darb-rest/i18n";
import { loadRestaurant } from "../../../lib/restaurant";
import PublicOrderPage from "../order/[businessSlug]/[locationSlug]/page";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; businessSlug: string }>;
  searchParams: Promise<{ branch?: string; order?: string; table?: string }>;
}) {
  const p = await params;
  if (!isValidLocale(p.locale)) return {};
  const q = await searchParams;
  const seo = await restaurantSeo(p.businessSlug, p.locale, q.branch);
  if (q.order || q.table) return { ...seo?.metadata, robots: { index: false, follow: false } };
  return seo?.metadata ?? { robots: { index: false, follow: false } };
}
export default async function RestaurantPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; businessSlug: string }>;
  searchParams: Promise<{ branch?: string; order?: string; table?: string }>;
}) {
  const p = await params,
    q = await searchParams;
  if (!isValidLocale(p.locale)) notFound();
  const restaurant = await loadRestaurant(p.businessSlug, q.branch);
  if (!restaurant) notFound();
  const seo = await restaurantSeo(p.businessSlug, p.locale, q.branch);
  const page = await PublicOrderPage({
    params: Promise.resolve({ ...p, locationSlug: restaurant.branch.slug }),
    searchParams: Promise.resolve(q),
  });
  return (
    <>
      {seo && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(seo.structured) }}
        />
      )}
      {page}
    </>
  );
}
