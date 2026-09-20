import { getDictionary } from "@darb-rest/i18n";
import {
  localizedContent,
  formatMenuPrice,
  type AnalyticsReport,
  type AnalyticsRow,
  type ContentName,
  type ContentLocale,
} from "@darb-rest/types";
export function AnalyticsDashboard({
  locale,
  report,
  from,
  to,
  branch,
  locations,
}: {
  locale: ContentLocale;
  report: AnalyticsReport;
  from: string;
  to: string;
  branch: string;
  locations: { id: string; name: ContentName }[];
}) {
  const { analytics: L, ordering: O, payments: P } = getDictionary(locale);
  const number = (n: number) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(n);
  const money = (n: number, c: string) => formatMenuPrice(n / 100, c, locale);
  const label = (r: AnalyticsRow): string => {
    if (r.name) return localizedContent(r.name, locale).text || L.none;
    if (r.key === "none") return L.none;
    if (r.kind === "fulfillment") return O[r.key as "dine_in" | "takeaway"];
    if (r.kind === "payments" || r.kind === "methods") return P[r.key as "pending"] ?? L.none;
    if (r.kind === "days")
      return new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }).format(
        new Date(Date.UTC(2026, 0, 4 + Number(r.key))),
      );
    if (r.kind === "daily")
      return new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }).format(new Date(r.key));
    if (r.kind === "hours") return `${number(Number(r.key))}:00`;
    return r.key;
  };
  const panel =
    "rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4 sm:p-6";
  const control = "mt-2 block min-h-11 w-full rounded-xl border bg-[var(--bg-surface)] px-3 py-2";
  const groups = [
    "daily",
    "hours",
    "days",
    "branches",
    "fulfillment",
    "methods",
    "payments",
    "tables",
  ] as const;
  return (
    <div className="space-y-6" data-analytics>
      <header>
        <h1 className="text-3xl font-bold">{L.title}</h1>
        <p className="mt-2 text-[var(--fg-muted)]">{L.subtitle}</p>
      </header>
      <form className={`${panel} grid gap-4 sm:grid-cols-2 xl:grid-cols-4`}>
        <label>
          {L.fromDate}
          <input className={control} required type="date" name="from" defaultValue={from} />
        </label>
        <label>
          {L.toDate}
          <input className={control} required type="date" name="to" defaultValue={to} />
        </label>
        <label>
          {O.branch}
          <select className={control} name="branch" defaultValue={branch}>
            <option value="">{O.allBranches}</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {localizedContent(l.name, locale).text}
              </option>
            ))}
          </select>
        </label>
        <button className="min-h-11 self-end rounded-xl bg-[var(--darb-green-deep)] px-4 py-3 text-white">
          {L.apply}
        </button>
      </form>
      <div className="flex flex-wrap justify-between gap-3 text-sm">
        <p>
          {L.timezone}: <bdi>{report.timezone}</bdi>
        </p>
        <a
          className="min-h-11 underline underline-offset-4"
          href={`/api/analytics?${new URLSearchParams({ from, to, branch, locale })}`}
        >
          {L.export}
        </a>
      </div>
      <p className="max-w-4xl text-sm leading-relaxed text-[var(--fg-muted)]">{L.notes}</p>
      {!report.rows.length ? (
        <p className={`${panel} py-16 text-center`} role="status">
          {L.empty}
        </p>
      ) : (
        <>
          {report.rows
            .filter((r) => r.kind === "summary")
            .map((r) => (
              <section
                key={r.currency}
                aria-label={`${L.summary} ${r.currency}`}
                className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
              >
                {[
                  [L.orders, number(r.orders)],
                  [L.value, money(r.value_cents, r.currency)],
                  [L.paid, money(r.paid_cents, r.currency)],
                  [
                    L.average,
                    r.value_orders ? money(r.value_cents / r.value_orders, r.currency) : L.none,
                  ],
                  [L.cancelled, `${number((r.cancelled / r.orders) * 100)}%`],
                  [L.rejected, `${number((r.rejected / r.orders) * 100)}%`],
                  [
                    L.prep,
                    r.prep_minutes === null
                      ? L.none
                      : `${number(r.prep_minutes)} ${L.minutes} · ${number(r.prep_samples)} ${L.samples}`,
                  ],
                  [
                    L.lifecycle,
                    r.lifecycle_minutes === null
                      ? L.none
                      : `${number(r.lifecycle_minutes)} ${L.minutes} · ${number(r.lifecycle_samples)} ${L.samples}`,
                  ],
                ].map(([name, value]) => (
                  <div className={panel} key={name}>
                    <p className="text-sm text-[var(--fg-muted)]">{name}</p>
                    <p className="mt-3 break-words text-xl font-semibold">
                      <bdi>{value}</bdi>
                    </p>
                  </div>
                ))}
              </section>
            ))}
          <p className="text-sm leading-relaxed text-[var(--fg-muted)]">{L.timing}</p>
          <div className="grid min-w-0 gap-5 xl:grid-cols-2">
            {groups.map((kind) => {
              const rows = report.rows.filter((r) => r.kind === kind);
              const max = Math.max(1, ...rows.map((r) => r.orders));
              return (
                <section className={`${panel} min-w-0`} key={kind}>
                  <h2 className="mb-5 text-lg font-semibold">{L[kind]}</h2>
                  {!rows.length ? (
                    <p>{L.empty}</p>
                  ) : (
                    <div className="max-h-96 space-y-4 overflow-y-auto pe-1">
                      {rows.map((r) => (
                        <div key={`${r.key}-${r.currency}`}>
                          <div className="flex items-baseline justify-between gap-3 text-sm">
                            <span className="min-w-0 break-words">{label(r)}</span>
                            <bdi className="shrink-0">
                              {number(r.orders)} · {money(r.value_cents, r.currency)}
                            </bdi>
                          </div>
                          <div
                            className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--bg-surface-elevated)]"
                            aria-hidden="true"
                          >
                            <div
                              className="h-full rounded-full bg-[var(--darb-green-deep)]"
                              style={{ width: `${(r.orders / max) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
          <section className={panel}>
            <h2 className="text-lg font-semibold">{L.items}</h2>
            <p className="my-3 text-sm text-[var(--fg-muted)]">{L.top}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-start text-sm">
                <thead>
                  <tr>
                    {[L.name, L.quantity, L.value].map((v) => (
                      <th className="p-3 text-start" key={v}>
                        {v}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.items.map((i) => (
                    <tr className="border-t" key={`${i.item_id}-${i.currency}`}>
                      <td className="p-3">{localizedContent(i.name, locale).text}</td>
                      <td className="p-3">{number(i.quantity)}</td>
                      <td className="p-3">
                        <bdi>{money(i.value_cents, i.currency)}</bdi>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
