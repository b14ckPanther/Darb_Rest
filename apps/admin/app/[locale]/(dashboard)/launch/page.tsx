import { notFound } from "next/navigation";
import { getDictionary, isValidLocale } from "@darb-rest/i18n";
import { canManageBranding } from "@darb-rest/types";
import { publicOrigin } from "@darb-rest/config";
import { contentContext } from "../../../../lib/content/service";
import { manageLaunch } from "../../../../lib/actions/launch";
export default async function LaunchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ result?: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const L = dict.launch;
  const ctx = await contentContext();
  if (!ctx || !canManageBranding(ctx.role)) notFound();
  const site = await ctx.db
    .from("restaurant_launch")
    .select("is_public")
    .eq("business_id", ctx.business.id)
    .maybeSingle();
  if (site.error) return <p role="alert">{L.unavailable}</p>;
  const { result } = await searchParams;
  const hidden = (
    <>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="business" value={ctx.business.id} />
    </>
  );
  const button = "min-h-11 rounded-xl border px-4 py-2";
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">{L.title}</h1>
        <p className="mt-3 text-[var(--fg-muted)]">{L.instructions}</p>
      </header>
      {result && <p role="status">{result === "saved" ? L.saved : L.failed}</p>}
      <section className="space-y-4 rounded-2xl border bg-[var(--bg-surface)] p-6">
        <h2 className="text-xl font-semibold">{site.data?.is_public ? L.published : L.private}</h2>
        <a
          className="block break-all underline"
          href={`${publicOrigin()}/${locale}/${ctx.business.slug}`}
        >
          {L.fallback}
        </a>
        {ctx.locations.map((location) => (
          <a
            key={location.id}
            className="block min-h-11 underline"
            href={`/api/menu-qr?locale=${locale}&location=${location.id}`}
          >
            {dict.tables.downloadSvg} · {location.name[locale]}
          </a>
        ))}
        <form action={manageLaunch}>
          {hidden}
          <button
            name="action"
            value={site.data?.is_public ? "unpublish" : "publish"}
            className={button}
          >
            {site.data?.is_public ? L.unpublish : L.publish}
          </button>
        </form>
      </section>
    </div>
  );
}
