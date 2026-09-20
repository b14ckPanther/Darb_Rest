import Link from "next/link";
import { getDictionary, type SupportedLocale } from "@darb-rest/i18n";
import { requirePlatform, requireData, platformPage } from "../../../../../lib/platform";
export default async function Users({
  params,
  searchParams,
}: {
  params: Promise<{ locale: SupportedLocale }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params,
    { db } = await requirePlatform(locale),
    L = getDictionary(locale).acquisition,
    page = platformPage((await searchParams).page);
  const result = await db
    .from("profiles")
    .select("id,full_name,created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id")
    .range((page - 1) * 25, page * 25 - 1);
  const users = requireData(result) ?? [];
  return (
    <>
      <h1 className="text-3xl font-bold">{L.users}</h1>
      {!users.length && <p>{L.noUsers}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        {users.map((u) => (
          <article key={u.id} className="rounded-xl border bg-[var(--bg-surface)] p-5">
            <h2 dir="auto" className="font-semibold">
              {u.full_name}
            </h2>
            <p className="mt-2 text-sm">{new Date(u.created_at).toLocaleDateString(locale)}</p>
          </article>
        ))}
      </div>
      <nav className="flex gap-5">
        {page > 1 && (
          <Link className="py-3 underline" href={`?page=${page - 1}`}>
            {L.previous}
          </Link>
        )}
        {page * 25 < (result.count ?? 0) && (
          <Link className="py-3 underline" href={`?page=${page + 1}`}>
            {L.next}
          </Link>
        )}
      </nav>
    </>
  );
}
