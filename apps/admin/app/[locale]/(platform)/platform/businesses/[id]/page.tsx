import { notFound } from "next/navigation";
import Link from "next/link";
import { getDictionary, type SupportedLocale } from "@darb-rest/i18n";
import { localizedContent, type ContentName, FEATURE_FLAGS } from "@darb-rest/types";
import { requirePlatform, requireData, platformPage } from "../../../../../../lib/platform";
import { updatePlatformBusiness } from "../../../../../../lib/actions/platform";
export default async function BusinessDetail({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ result?: string; page?: string }>;
}) {
  const { locale: rawLocale, id } = await params,
    locale = rawLocale as SupportedLocale,
    { db } = await requirePlatform(locale),
    D = getDictionary(locale),
    L = D.platform,
    q = await searchParams,
    page = platformPage(q.page);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [business, branches, members, overrides, launch, domains] = await Promise.all([
    db
      .from("businesses")
      .select(
        "id,name,slug,legal_name,business_type,status,created_at,disabled_at,plan_id,plan:plans(name)",
      )
      .eq("id", id)
      .maybeSingle(),
    db
      .from("locations")
      .select("id,name,slug,status")
      .eq("business_id", id)
      .order("id")
      .range((page - 1) * 25, page * 25 - 1),
    db
      .from("memberships")
      .select("id,user_id,role,status")
      .eq("business_id", id)
      .order("id")
      .range((page - 1) * 25, page * 25 - 1),
    db
      .from("business_feature_overrides")
      .select("feature_key,enabled,limit_value,reason,expires_at")
      .eq("business_id", id)
      .order("feature_key")
      .range((page - 1) * 25, page * 25 - 1),
    db.from("restaurant_launch").select("is_public").eq("business_id", id).maybeSingle(),
    db
      .from("business_domains")
      .select("hostname,active,canonical,verified_until")
      .eq("business_id", id)
      .order("id")
      .range((page - 1) * 25, page * 25 - 1),
  ]);
  [business, branches, members, overrides, launch, domains].forEach((r) => {
    if (r.error) throw Error("platform_query_failed");
  });
  const b = requireData(business);
  if (!b) notFound();
  const card =
    "space-y-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5";
  return (
    <>
      <Link href={`/${locale}/platform/businesses`} className="text-sm underline">
        {L.businesses}
      </Link>
      <h1
        lang={localizedContent(b.name as ContentName, locale).lang}
        className="break-words text-3xl font-bold"
      >
        {localizedContent(b.name as ContentName, locale).text}
      </h1>
      {q.result && <p role="status">{q.result === "saved" ? L.saved : L.failed}</p>}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className={card}>
          <h2 className="text-xl font-semibold">{L.identity}</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <dt>{L.slug}</dt>
            <dd className="break-all" lang="en">
              {b.slug}
            </dd>
            <dt>{L.type}</dt>
            <dd lang="en">{b.business_type}</dd>
            <dt>{L.status}</dt>
            <dd>{L[b.status as "active"] ?? b.status}</dd>
            <dt>{L.plan}</dt>
            <dd>
              <Link className="underline" href={`/${locale}/platform/plans#${b.plan_id ?? ""}`}>
                {b.plan ? localizedContent(b.plan.name as ContentName, locale).text : "—"}
              </Link>
            </dd>
            <dt>{L.created}</dt>
            <dd>
              {new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
                new Date(b.created_at),
              )}
            </dd>
            <dt>{L.publication}</dt>
            <dd>{launch.data?.is_public ? D.launch.published : D.launch.private}</dd>
          </dl>
        </section>
        <section className={card}>
          <h2 className="text-xl font-semibold">{L.operational}</h2>
          <form action={updatePlatformBusiness} className="space-y-4">
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="business" value={id} />
            <label className="flex gap-3">
              <input type="checkbox" name="confirm" required />
              {L.confirm}
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                name="action"
                value="activate"
                className="rounded-lg bg-[var(--darb-green-deep)] px-4 py-3 text-white"
              >
                {L.activate}
              </button>
              <button name="action" value="suspend" className="rounded-lg border px-4 py-3">
                {L.suspend}
              </button>
            </div>
          </form>
        </section>
        <section className={card}>
          <h2 className="text-xl font-semibold">{L.branches}</h2>
          {!branches.data?.length && <p>{L.empty}</p>}
          {branches.data?.map((v) => (
            <div key={v.id} className="flex flex-wrap justify-between gap-2 border-t pt-3">
              <span lang={localizedContent(v.name as ContentName, locale).lang}>
                {localizedContent(v.name as ContentName, locale).text}
              </span>
              <span lang="en">{v.status}</span>
            </div>
          ))}
        </section>
        <section className={card}>
          <h2 className="text-xl font-semibold">{L.memberships}</h2>
          {!members.data?.length && <p>{L.empty}</p>}
          {members.data?.map((v) => (
            <div key={v.id} className="space-y-1 border-t pt-3 text-sm">
              <p className="break-all" dir="ltr" lang="en">
                {v.user_id}
              </p>
              <p lang="en">
                {v.role} · {v.status}
              </p>
            </div>
          ))}
        </section>
        <section className={card}>
          <h2 className="text-xl font-semibold">{L.domains}</h2>
          {domains.data?.map((v) => (
            <div key={v.hostname} className="space-y-2 border-t pt-3">
              <p className="break-all" lang="en" dir="ltr">
                {v.hostname}
              </p>
              <p>
                {v.active ? D.launch.active : D.launch.inactive} ·{" "}
                {v.verified_until && Date.parse(v.verified_until) > Date.now()
                  ? D.launch.verified
                  : D.launch.pending}
                {v.canonical ? ` · ${D.launch.canonical}` : ""}
              </p>
            </div>
          ))}
          {!domains.data?.length && <p>{L.empty}</p>}
        </section>
        <section className={card}>
          <h2 className="text-xl font-semibold">{L.overrides}</h2>
          {overrides.data?.map((v) => (
            <div key={v.feature_key} className="space-y-1 border-t pt-3 text-sm">
              <p lang="en">{v.feature_key}</p>
              <p>
                {v.enabled ? L.enabled : "—"} · {v.limit_value ?? L.unlimited}
              </p>
              <p>{v.reason}</p>
              <p>
                {L.expires}:{" "}
                {v.expires_at
                  ? new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(
                      new Date(v.expires_at),
                    )
                  : "—"}
              </p>
            </div>
          ))}
        </section>
      </div>
      <nav className="flex gap-5">
        {page > 1 && <Link href={`?page=${page - 1}`}>{L.previous}</Link>}
        {[branches.data, members.data, overrides.data, domains.data].some(
          (rows) => rows?.length === 25,
        ) && <Link href={`?page=${page + 1}`}>{L.next}</Link>}
      </nav>
      <form action={updatePlatformBusiness} className={card}>
        <h2 className="text-xl font-semibold">{L.overrides}</h2>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="business" value={id} />
        <input type="hidden" name="action" value="override" />
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            {L.feature}
            <select name="feature" className="mt-2 block w-full rounded-lg border p-3" lang="en">
              {FEATURE_FLAGS.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </label>
          <label>
            {L.limit}
            <input
              name="limit"
              type="number"
              min="0"
              step="1"
              className="mt-2 block w-full rounded-lg border p-3"
            />
          </label>
          <label>
            {L.reason}
            <input
              name="reason"
              required
              maxLength={500}
              className="mt-2 block w-full rounded-lg border p-3"
            />
          </label>
          <label>
            {L.expires}
            <input
              name="expires"
              type="datetime-local"
              className="mt-2 block w-full rounded-lg border p-3"
            />
          </label>
        </div>
        <label className="flex gap-3">
          <input type="checkbox" name="enabled" />
          {L.enabled}
        </label>
        <label className="flex gap-3">
          <input type="checkbox" name="confirm" required />
          {L.confirm}
        </label>
        <button className="rounded-lg bg-[var(--darb-green-deep)] px-5 py-3 text-white">
          {L.save}
        </button>
      </form>
    </>
  );
}
