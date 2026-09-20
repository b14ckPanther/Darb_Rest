import { getDictionary, type SupportedLocale } from "@darb-rest/i18n";
import { localizedContent, type ContentName } from "@darb-rest/types";
import { requirePlatform, requireData, platformPage } from "../../../../../lib/platform";
import Link from "next/link";
export default async function Plans({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale: rawLocale } = await params,
    locale = rawLocale as SupportedLocale,
    { db } = await requirePlatform(locale),
    L = getDictionary(locale).platform,
    page = platformPage((await searchParams).page);
  const result = await db
    .from("plans")
    .select("id,name,code,is_active,plan_entitlements(feature_key,enabled,limit_value)", {
      count: "exact",
    })
    .order("created_at")
    .order("id")
    .range((page - 1) * 25, page * 25 - 1);
  const rows = requireData(result);
  return (
    <>
      <h1 className="text-3xl font-bold">{L.plans}</h1>
      <div className="grid gap-5 md:grid-cols-2">
        {rows?.map((p) => (
          <section
            id={p.id}
            key={p.id}
            className="space-y-4 rounded-xl border bg-[var(--bg-surface)] p-5"
          >
            <h2
              lang={localizedContent(p.name as ContentName, locale).lang}
              className="text-xl font-semibold"
            >
              {localizedContent(p.name as ContentName, locale).text}
            </h2>
            <p lang="en">{p.code}</p>
            <p>{p.is_active ? L.active : L.archived}</p>
            <ul className="space-y-3">
              {p.plan_entitlements.map((e) => (
                <li
                  key={e.feature_key}
                  className="flex flex-wrap justify-between gap-3 border-t pt-3"
                >
                  <span lang="en">{e.feature_key}</span>
                  <span>
                    {e.enabled ? L.enabled : "—"} · {e.limit_value ?? L.unlimited}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      <nav className="flex gap-5">
        {page > 1 && <Link href={`?page=${page - 1}`}>{L.previous}</Link>}
        {page * 25 < (result.count ?? 0) && <Link href={`?page=${page + 1}`}>{L.next}</Link>}
      </nav>
    </>
  );
}
