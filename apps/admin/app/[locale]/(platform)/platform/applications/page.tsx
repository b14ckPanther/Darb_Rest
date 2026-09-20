import Link from "next/link";
import { getDictionary, type SupportedLocale } from "@darb-rest/i18n";
import { requirePlatform, requireData, platformPage } from "../../../../../lib/platform";
export default async function Applications({
  params,
  searchParams,
}: {
  params: Promise<{ locale: SupportedLocale }>;
  searchParams: Promise<{
    q?: string;
    status?: string;
    page?: string;
    kind?: string;
    result?: string;
  }>;
}) {
  const { locale } = await params,
    s = await searchParams,
    { db } = await requirePlatform(locale),
    L = getDictionary(locale).acquisition;
  const page = platformPage(s.page),
    size = 20;
  const term = (s.q ?? "")
    .trim()
    .slice(0, 100)
    .replace(/[^\p{L}\p{N}@. +_-]/gu, "");
  let query = db
    .from("restaurant_applications")
    .select(
      "id,kind,full_name,business_name,email,phone,city,business_type,branch_count,requested_plan_code,status,created_at",
      { count: "exact" },
    );
  if (s.status === "pending" || s.status === "approved" || s.status === "rejected")
    query = query.eq("status", s.status);
  if (s.kind === "application" || s.kind === "inquiry") query = query.eq("kind", s.kind);
  if (term)
    query = query.or(
      `full_name.ilike.%${term}%,business_name.ilike.%${term}%,email.ilike.%${term}%`,
    );
  const result = await query
    .order("reviewed_at", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: false })
    .order("id")
    .range((page - 1) * size, page * size - 1);
  const rows = requireData(result) ?? [];
  const href = (p: number) =>
    `/${locale}/platform/applications?${new URLSearchParams({ q: term, status: s.status ?? "", kind: s.kind ?? "", page: String(p) })}`;
  return (
    <>
      <h1 className="text-3xl font-bold">{L.applications}</h1>
      {s.result === "failed" && <p role="alert">{L.reviewFailed}</p>}
      <form className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto]">
        <input
          name="q"
          defaultValue={term}
          maxLength={100}
          aria-label={L.search}
          placeholder={L.search}
          className="min-h-12 min-w-0 rounded-lg border bg-white px-3"
        />
        <select
          name="status"
          defaultValue={s.status ?? ""}
          aria-label={L.review}
          className="min-h-12 rounded-lg border px-3"
        >
          <option value="">{L.all}</option>
          {(["pending", "approved", "rejected"] as const).map((v) => (
            <option key={v} value={v}>
              {L[v]}
            </option>
          ))}
        </select>
        <select
          name="kind"
          defaultValue={s.kind ?? ""}
          aria-label={L.applications}
          className="min-h-12 rounded-lg border px-3"
        >
          <option value="">{L.all}</option>
          <option value="application">{L.applications}</option>
          <option value="inquiry">{L.inquiries}</option>
        </select>
        <button className="min-h-12 rounded-lg bg-[var(--darb-green-deep)] px-5 text-white">
          {L.filter}
        </button>
      </form>
      {!rows.length && <p className="py-10 text-[var(--fg-muted)]">{L.empty}</p>}
      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((r) => (
          <Link
            key={r.id}
            href={`/${locale}/platform/applications/${r.id}`}
            className="min-w-0 space-y-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 hover:border-[var(--darb-green-deep)]"
          >
            <div className="flex flex-wrap justify-between gap-2">
              <h2 dir="auto" className="text-xl font-bold">
                {r.business_name}
              </h2>
              <span className="text-sm font-semibold">{L[r.status]}</span>
            </div>
            <p dir="auto">{r.full_name}</p>
            <p className="text-sm text-[var(--fg-muted)]">
              {r.kind === "inquiry" ? L.inquiries : L.applications}
            </p>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              {[
                [L.email, r.email],
                [L.phone, r.phone],
                [L.city, r.city],
                [L.business_type, r.business_type ? L[r.business_type] : null],
                [L.branch_count, r.branch_count?.toLocaleString(locale)],
                [L.requested_plan_code, L[r.requested_plan_code ?? "unsure"]],
                [L.created, new Date(r.created_at).toLocaleDateString(locale)],
              ].map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="text-[var(--fg-muted)]">{label}</dt>
                  <dd dir="auto" className="min-w-0 break-words">
                    {value ?? "—"}
                  </dd>
                </div>
              ))}
            </dl>
          </Link>
        ))}
      </div>
      <nav className="flex gap-5" aria-label={L.applications}>
        {page > 1 && (
          <Link className="py-3 underline" href={href(page - 1)}>
            {L.previous}
          </Link>
        )}
        {page * size < (result.count ?? 0) && (
          <Link className="py-3 underline" href={href(page + 1)}>
            {L.next}
          </Link>
        )}
      </nav>
    </>
  );
}
