import { localizedContent } from "@darb-rest/types";
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
  searchParams: Promise<{ branch?: string }>;
}) {
  const p = await params;
  if (!isValidLocale(p.locale)) return {};
  const r = await loadRestaurant(p.businessSlug, (await searchParams).branch);
  if (!r) return { robots: { index: false, follow: false } };
  return {
    title: localizedContent(r.business.name, p.locale).text,
    referrer: "no-referrer" as const,
    alternates: { canonical: `https://rest.darb.co.il/${p.businessSlug}?branch=${r.branch.slug}` },
  };
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
  return PublicOrderPage({
    params: Promise.resolve({ ...p, locationSlug: restaurant.branch.slug }),
    searchParams: Promise.resolve(q),
  });
}
