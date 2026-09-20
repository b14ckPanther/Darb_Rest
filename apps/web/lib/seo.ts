import "server-only";
import { cache } from "react";
import type { Metadata } from "next";
import { getDictionary, type SupportedLocale } from "@darb-rest/i18n";
import { localizedContent, brandingUrl, restaurantCanonical } from "@darb-rest/types";
import { loadRestaurant } from "./restaurant";
import { loadPublicMenu } from "./guest-orders";
import { canonicalOrigin } from "./launch";
export const restaurantSeo = cache(
  async (slug: string, locale: SupportedLocale, branch?: string) => {
    const r = await loadRestaurant(slug, branch);
    if (!r) return null;
    const menu = await loadPublicMenu(slug, r.branch.slug);
    if (!menu?.content.menus.length) return null;
    const { origin, custom } = await canonicalOrigin(r.business.id);
    const url = restaurantCanonical(origin, slug, locale, r.branch.slug, custom);
    const title = localizedContent(r.business.name, locale).text;
    const description = `${title} — ${getDictionary(locale).launch.description}`;
    const ref = r.settings.cover || r.settings.logo;
    const image = ref ? new URL(brandingUrl(ref), origin).toString() : undefined;
    const metadata: Metadata = {
      title,
      description,
      metadataBase: new URL(origin),
      referrer: "no-referrer",
      alternates: {
        canonical: url,
        languages: Object.fromEntries(
          ["ar", "he", "en"].map((l) => [
            l,
            restaurantCanonical(origin, slug, l, r.branch.slug, custom),
          ]),
        ),
      },
      robots: { index: true, follow: true },
      openGraph: {
        title,
        description,
        url,
        siteName: title,
        locale: { ar: "ar_IL", he: "he_IL", en: "en_US" }[locale],
        type: "website",
        ...(image ? { images: [{ url: image, alt: title }] } : {}),
      },
      twitter: {
        card: image ? "summary_large_image" : "summary",
        title,
        description,
        ...(image ? { images: [image] } : {}),
      },
    };
    const structured = {
      "@context": "https://schema.org",
      "@type": "Restaurant",
      "@id": url + "#restaurant",
      name: title,
      description,
      url,
      address: r.profile.address,
      telephone: r.profile.phone || undefined,
      image,
      sameAs: [r.profile.website, r.profile.instagram, r.profile.facebook].filter(Boolean),
      hasMenu: url,
      openingHoursSpecification: r.profile.hours
        .filter((h) => !h.is_closed)
        .map((h) => ({
          "@type": "OpeningHoursSpecification",
          dayOfWeek: `https://schema.org/${["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][h.day_of_week - 1]}`,
          opens: h.open_time.slice(0, 5),
          closes: h.close_time.slice(0, 5),
        })),
    };
    return { metadata, structured };
  },
);
