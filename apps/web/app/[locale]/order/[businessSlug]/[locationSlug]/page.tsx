import { loadRestaurant } from "../../../../../lib/restaurant";
import { RestaurantBranches } from "../../../../../components/restaurant-branches";
import { RestaurantLanguage } from "../../../../../components/restaurant-language";
import { notFound } from "next/navigation";
import { getDictionary, isValidLocale } from "@darb-rest/i18n";
import { OrderingMenu } from "@darb-rest/ui";
import { loadPublicMenu, loadGuestDraft } from "../../../../../lib/guest-orders";
import { saveQrOrder, checkoutQrOrder, simulatePayment } from "../../../../../lib/order-actions";
import { paymentProvider } from "../../../../../lib/payments";
import { guestDb } from "../../../../../lib/guest-orders";
import type { PaymentSummary } from "@darb-rest/types";
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
  const requested = query.order;
  const orderId = requested && /^[a-f0-9-]{36}$/.test(requested) ? requested : undefined;
  const initialOrder = await loadGuestDraft(
    loaded.business.id,
    loaded.locations[0]!.id,
    orderId,
    table?.table_id,
  );
  const paymentResult = initialOrder
    ? await guestDb()
        .from("payments")
        .select("id,method,status,amount_cents,currency,reference")
        .eq("order_id", initialOrder.id)
        .eq("business_id", loaded.business.id)
        .maybeSingle()
    : null;
  if (paymentResult?.error) throw paymentResult.error;
  const payment = paymentResult?.data ?? null;
  const provider = paymentProvider();
  return (
    <main className="min-h-screen bg-[#faf8f4] px-3 py-5 text-[#202620] sm:px-6">
      <RestaurantLanguage label={dict.common.language} locale={locale} />
      {restaurant && (
        <RestaurantBranches
          branches={restaurant.branches}
          business={businessSlug}
          locale={locale}
          current={locationSlug}
          label={dict.appearance.branch}
          confirmLabel={dict.ordering.changeBranch}
        />
      )}
      {!loaded.content.menus.length && (!initialOrder || initialOrder.status === "draft") ? (
        <p className="mx-auto max-w-lg p-10">{dict.ordering.noPublicMenu}</p>
      ) : (
        <OrderingMenu
          restaurant={
            restaurant
              ? {
                  settings: restaurant.settings,
                  profile: restaurant.profile,
                  labels: dict.appearance,
                }
              : undefined
          }
          data={loaded.content}
          business={loaded.business}
          locations={loaded.locations}
          branding={loaded.branding}
          images={loaded.images}
          locale={locale}
          labels={{ ...dict.content, previewNote: dict.ordering.orderNote }}
          orderLabels={dict.ordering}
          initialOrder={initialOrder}
          paymentLabels={dict.payments}
          initialPayment={payment as PaymentSummary | null}
          onlineAvailable={!!provider}
          testPayment={provider?.testOnly ? simulatePayment : undefined}
          tableContext={table ? { name: table.name, area: table.area } : null}
          tableLabels={dict.tables}
          checkout={checkoutQrOrder.bind(null, businessSlug, locationSlug, token)}
          receiptQuery
          scope={`guest-cart:${loaded.business.id}:${loaded.locations[0]!.id}:${token ?? "no-table"}`}
          persist={saveQrOrder.bind(null, businessSlug, locationSlug, token)}
        />
      )}
    </main>
  );
}
