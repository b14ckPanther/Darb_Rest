import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary, isValidLocale } from "@darb-rest/i18n";
import {
  ORDER_STATUSES,
  formatMenuPrice,
  localizedContent,
  type OrderStatus,
} from "@darb-rest/types";
import { contentContext } from "../../../../lib/content/service";
export default async function OrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; branch?: string; page?: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();
  const { ordering: L, content: C } = getDictionary(locale);
  const ctx = await contentContext();
  if (!ctx) return <p>{C.connect}</p>;
  const filter = await searchParams;
  const page = Math.max(0, Math.min(10000, Number.parseInt(filter.page ?? "0") || 0));
  let query = ctx.db
    .from("orders")
    .select(
      "id,location_id,status,customer_name,fulfillment_mode,subtotal_cents,currency,created_at",
      { count: "exact" },
    )
    .eq("business_id", ctx.business.id)
    .order("created_at", { ascending: false })
    .order("id")
    .range(page * 25, page * 25 + 24);
  if (ORDER_STATUSES.includes(filter.status as OrderStatus))
    query = query.eq("status", filter.status!);
  if (ctx.locations.some((l) => l.id === filter.branch))
    query = query.eq("location_id", filter.branch!);
  const { data, error, count } = await query;
  if (error) throw error;
  const href = (n: number) =>
    `/${locale}/orders?` +
    new URLSearchParams({
      page: String(n),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.branch ? { branch: filter.branch } : {}),
    }).toString();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">{L.title}</h1>
        <p className="mt-2 text-sm text-[var(--fg-muted)]">{L.subtitle}</p>
      </header>
      <form className="flex flex-wrap items-end gap-3">
        <label className="text-sm">
          {L.status}
          <select
            aria-label={L.status}
            name="status"
            defaultValue={filter.status ?? ""}
            className="ms-2 min-h-11 rounded-xl border bg-[var(--bg-surface)] p-2"
          >
            <option value="">{L.allStatuses}</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {L[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          {L.branch}
          <select
            aria-label={L.branch}
            name="branch"
            defaultValue={filter.branch ?? ""}
            className="ms-2 min-h-11 rounded-xl border bg-[var(--bg-surface)] p-2"
          >
            <option value="">{L.allBranches}</option>
            {ctx.locations.map((l) => (
              <option key={l.id} value={l.id}>
                {localizedContent(l.name, locale).text}
              </option>
            ))}
          </select>
        </label>
        <button className="min-h-11 rounded-xl border px-4">{L.refresh}</button>
      </form>
      {!data?.length ? (
        <p className="py-12 text-center text-[var(--fg-muted)]">{L.noOrders}</p>
      ) : (
        <div className="divide-y rounded-2xl border bg-[var(--bg-surface)]">
          {data.map((o) => (
            <Link
              href={`/${locale}/orders/${o.id}`}
              key={o.id}
              className="flex flex-wrap items-center justify-between gap-4 p-5 hover:bg-[var(--bg-surface-elevated)]"
            >
              <div>
                <p className="font-semibold">{o.customer_name}</p>
                <p className="mt-1 text-sm text-[var(--fg-muted)]">
                  {L[o.status as OrderStatus]} · {L[o.fulfillment_mode as "dine_in" | "takeaway"]}
                </p>
                <p className="mt-1 text-xs">
                  {
                    localizedContent(
                      ctx.locations.find((l) => l.id === o.location_id)?.name ?? {},
                      locale,
                    ).text
                  }
                </p>
              </div>
              <div className="text-end">
                <bdi>{formatMenuPrice(o.subtotal_cents / 100, o.currency, locale)}</bdi>
                <p className="mt-1 text-xs text-[var(--fg-muted)]">
                  <time dateTime={o.created_at}>
                    {new Intl.DateTimeFormat(locale, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }).format(new Date(o.created_at))}
                  </time>
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
      <nav className="flex justify-between">
        {page > 0 ? (
          <Link className="inline-flex min-h-11 items-center" href={href(page - 1)}>
            {L.newer}
          </Link>
        ) : (
          <span />
        )}
        {(count ?? 0) > (page + 1) * 25 && (
          <Link className="inline-flex min-h-11 items-center" href={href(page + 1)}>
            {L.older}
          </Link>
        )}
      </nav>
    </div>
  );
}
