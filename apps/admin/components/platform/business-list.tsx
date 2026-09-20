import Link from "next/link";
import { getDictionary, type SupportedLocale } from "@darb-rest/i18n";
import { localizedContent, type ContentName } from "@darb-rest/types";
import { requirePlatform, requireData } from "../../lib/platform";
export async function BusinessList({
  locale,
  page = 1,
  search = "",
  recent = false,
}: {
  locale: SupportedLocale;
  page?: number;
  search?: string;
  recent?: boolean;
}) {
  const { db } = await requirePlatform(locale),
    L = getDictionary(locale).platform;
  const size = recent ? 6 : 25;
  let query = db
    .from("businesses")
    .select("id,name,slug,business_type,status,created_at,plan:plans(name),locations(count)", {
      ...(recent ? {} : { count: "exact" as const }),
    });
  const term = search
    .trim()
    .slice(0, 100)
    .replace(/[^\p{L}\p{N} -]/gu, "");
  if (term)
    query = query.or(
      `slug.ilike.%${term}%,name->>en.ilike.%${term}%,name->>ar.ilike.%${term}%,name->>he.ilike.%${term}%`,
    );
  const result = await query
    .order("created_at", { ascending: false })
    .order("id")
    .range((page - 1) * size, page * size - 1);
  const rows = requireData(result) as unknown as {
    id: string;
    name: ContentName;
    slug: string;
    business_type: string;
    status: string;
    created_at: string;
    plan: { name: ContentName } | null;
    locations: { count: number }[];
  }[];
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((b) => (
          <Link
            key={b.id}
            href={`/${locale}/platform/businesses/${b.id}`}
            className="space-y-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5 transition-colors hover:border-[var(--darb-green-deep)]"
          >
            <h2 lang={localizedContent(b.name, locale).lang} className="text-xl font-bold">
              {localizedContent(b.name, locale).text}
            </h2>
            <p className="break-all text-sm text-[var(--fg-muted)]" lang="en" dir="ltr">
              {b.slug}
            </p>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <dt>{L.status}</dt>
              <dd>{L[b.status as "active"] ?? b.status}</dd>
              <dt>{L.type}</dt>
              <dd lang="en">{b.business_type}</dd>
              <dt>{L.plan}</dt>
              <dd lang={b.plan ? localizedContent(b.plan.name, locale).lang : locale}>
                {b.plan ? localizedContent(b.plan.name, locale).text : "—"}
              </dd>
              <dt>{L.branches}</dt>
              <dd>{b.locations[0]?.count ?? 0}</dd>
              <dt>{L.created}</dt>
              <dd>
                {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
                  new Date(b.created_at),
                )}
              </dd>
            </dl>
          </Link>
        ))}
      </div>
      {!rows.length && <p>{L.empty}</p>}
      {!recent && (
        <nav className="flex gap-5 py-5">
          {page > 1 && (
            <Link href={`?page=${page - 1}&q=${encodeURIComponent(search)}`}>{L.previous}</Link>
          )}
          {page * size < (result.count ?? 0) && (
            <Link href={`?page=${page + 1}&q=${encodeURIComponent(search)}`}>{L.next}</Link>
          )}
        </nav>
      )}
    </>
  );
}
