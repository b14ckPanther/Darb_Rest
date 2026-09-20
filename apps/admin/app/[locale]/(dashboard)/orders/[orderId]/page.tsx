import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary, isValidLocale } from "@darb-rest/i18n";
import { ContentText } from "@darb-rest/ui";
import { formatMenuPrice, type ContentName, type OrderStatus } from "@darb-rest/types";
import { loadOrderDetail } from "../../../../../lib/orders/service";
import { StatusActions } from "../../../../../components/orders/status-actions";
import { RestaurantPayment } from "../../../../../components/orders/restaurant-payment";
export default async function OrderPage({
  params,
}: {
  params: Promise<{ locale: string; orderId: string }>;
}) {
  const { locale, orderId } = await params;
  if (!isValidLocale(locale)) notFound();
  const loaded = await loadOrderDetail(orderId);
  if (!loaded) notFound();
  const { order: o, items, modifiers } = loaded;
  const { ordering: L, payments: P, tables: T } = getDictionary(locale);
  const money = (c: number) => formatMenuPrice(c / 100, o.currency, locale);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link className="inline-flex min-h-11 items-center text-sm" href={`/${locale}/orders`}>
        {L.title}
      </Link>
      <header>
        <p className="text-sm text-[var(--fg-muted)]">{L[o.status as OrderStatus]}</p>
        <h1 className="mt-2 text-3xl font-bold">{L.details}</h1>
        <p className="mt-2 break-all text-xs">
          {L.reference}: <bdi>{o.id}</bdi>
        </p>
      </header>
      <StatusActions
        id={o.id}
        revision={o.revision}
        status={o.status as OrderStatus}
        role={loaded.role}
      />
      <section className="space-y-3 rounded-2xl border bg-[var(--bg-surface)] p-5">
        <h2 className="font-semibold">{P.title}</h2>
        {loaded.payment ? (
          <>
            <p>
              {P[loaded.payment.method as "restaurant" | "online"]} ·{" "}
              <strong>{P[loaded.payment.status as "pending"]}</strong>
            </p>
            <p>
              <bdi>{money(loaded.payment.amount_cents)}</bdi>
            </p>
            <p className="break-all text-xs">
              {P.reference}: <bdi>{loaded.payment.reference}</bdi>
            </p>
            <RestaurantPayment payment={loaded.payment} role={loaded.role} />
          </>
        ) : (
          <p>{P.unrecorded}</p>
        )}
      </section>
      <section className="space-y-2 rounded-2xl border bg-[var(--bg-surface)] p-5">
        <h2 className="font-semibold">{L.customer}</h2>
        <p>{o.customer_name}</p>
        {o.table_name && (
          <p className="font-semibold">
            {T.table}: <bdi>{o.table_name}</bdi>
            {o.table_area && (
              <>
                {" "}
                · <bdi>{o.table_area}</bdi>
              </>
            )}
          </p>
        )}
        {o.customer_phone && <p dir="ltr">{o.customer_phone}</p>}
        <p>
          {L[o.fulfillment_mode as "dine_in" | "takeaway"]} ·{" "}
          <ContentText
            value={loaded.locations.find((l) => l.id === o.location_id)?.name ?? {}}
            locale={locale}
          />
        </p>
      </section>
      <section className="divide-y rounded-2xl border bg-[var(--bg-surface)] px-5">
        <h2 className="py-5 text-xl font-semibold">{L.items}</h2>
        {items.map((i) => (
          <article className="space-y-2 py-5" key={i.id}>
            <div className="flex justify-between gap-3">
              <h3 className="font-semibold">
                {i.quantity} × <ContentText value={i.name_i18n as ContentName} locale={locale} />
              </h3>
              <bdi>{money(i.line_total_cents)}</bdi>
            </div>
            {i.variant_name_i18n && (
              <p className="text-sm">
                <ContentText value={i.variant_name_i18n as ContentName} locale={locale} />
              </p>
            )}
            {modifiers
              .filter((m) => m.order_item_id === i.id)
              .map((m) => (
                <p className="flex justify-between gap-3 text-sm text-[var(--fg-muted)]" key={m.id}>
                  <span>
                    <ContentText value={m.group_name_i18n as ContentName} locale={locale} /> ·{" "}
                    <ContentText value={m.name_i18n as ContentName} locale={locale} />
                  </span>
                  <bdi>+{money(m.price_cents)}</bdi>
                </p>
              ))}
          </article>
        ))}
        <div className="flex justify-between py-5 text-lg font-bold">
          <span>{L.subtotal}</span>
          <bdi>{money(o.subtotal_cents)}</bdi>
        </div>
      </section>
    </div>
  );
}
