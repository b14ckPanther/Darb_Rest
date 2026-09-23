import { commercialLabels } from "@darb-rest/i18n";
import { prepareWhatsapp } from "../../../../../lib/whatsapp-actions";
import { v1Context } from "../../../../../lib/v1-context";
import { loadRestaurant } from "../../../../../lib/restaurant";
import { notFound } from "next/navigation";
import { getDictionary, isValidLocale } from "@darb-rest/i18n";
import { WhatsappMenu } from "@darb-rest/ui";
import { loadPublicMenu } from "../../../../../lib/guest-orders";
import { resolveTableToken } from "../../../../../lib/table-context";
export const metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";
export default async function PublicOrderPage({
  params,
  searchParams,
}: {
  searchParams: Promise<{ order?: string; table?: string }>;
  params: Promise<{ locale: string; businessSlug: string; locationSlug: string }>;
}) {
  const { locale, businessSlug, locationSlug } = await params;
  if (!isValidLocale(locale)) notFound();
  const loaded = await loadPublicMenu(businessSlug, locationSlug);
  if (!loaded) notFound();
  const restaurant = await loadRestaurant(businessSlug, locationSlug);
  const dict = getDictionary(locale);
  const query = await searchParams;
  const token = query.table ?? null;
  const table = token ? await resolveTableToken(token) : null;
  if (
    token !== null &&
    (!table || table.business_slug !== businessSlug || table.location_slug !== locationSlug)
  )
    return (
      <main className="mx-auto max-w-lg px-5 py-20">
        <h1 className="text-3xl font-bold">{dict.tables.invalidQr}</h1>
        <p className="mt-4">{dict.tables.invalidQrNote}</p>
      </main>
    );
  if (!restaurant) notFound();
  const access = await v1Context(loaded.business.id, loaded.locations[0]!.id);
  return (
    <main className="min-h-screen">
      <WhatsappMenu
        restaurant={{
          settings: restaurant.settings,
          profile: restaurant.profile,
          labels: dict.appearance,
          branches: restaurant.branches,
          currentBranchSlug: locationSlug,
          businessSlug: businessSlug,
          confirmBranchLabel: dict.ordering.changeBranch,
        }}
        access={access}
        L={commercialLabels[locale]}
        scope={`v1-cart:${loaded.business.id}:${loaded.locations[0]!.id}`}
        prepare={prepareWhatsapp.bind(null, businessSlug, locationSlug, locale)}
        data={loaded.content}
        business={loaded.business}
        locations={loaded.locations}
        images={loaded.images}
        locale={locale}
        labels={{ ...dict.content, previewNote: commercialLabels[locale].digital }}
      />
    </main>
  );
}
