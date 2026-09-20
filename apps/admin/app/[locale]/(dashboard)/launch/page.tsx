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
  const L = getDictionary(locale).launch;
  const ctx = await contentContext();
  if (!ctx || !canManageBranding(ctx.role)) notFound();
  const [site, domains] = await Promise.all([
    ctx.db
      .from("restaurant_launch")
      .select("is_public")
      .eq("business_id", ctx.business.id)
      .maybeSingle(),
    ctx.db
      .from("business_domains")
      .select("*")
      .eq("business_id", ctx.business.id)
      .order("created_at"),
  ]);
  if (site.error || domains.error) return <p role="alert">{L.unavailable}</p>;
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
      <form action={manageLaunch} className="flex flex-wrap items-end gap-3 rounded-2xl border p-6">
        {hidden}
        <label className="min-w-0 flex-1">
          {L.hostname}
          <input
            name="hostname"
            required
            maxLength={253}
            dir="ltr"
            placeholder="menu.restaurant.example"
            className="mt-2 min-h-11 w-full rounded-xl border p-3"
          />
        </label>
        <button name="action" value="register" className={button}>
          {L.register}
        </button>
      </form>
      {(domains.data ?? []).map((d) => (
        <section key={d.id} className="space-y-3 rounded-2xl border bg-[var(--bg-surface)] p-6">
          <h2 className="break-all text-lg font-semibold" dir="ltr">
            {d.hostname}
          </h2>
          <p>
            {d.active ? L.active : L.inactive} ·{" "}
            {d.verified_until && Date.parse(d.verified_until) > Date.now() ? L.verified : L.pending}
            {d.canonical ? ` · ${L.canonical}` : ""}
          </p>
          <p className="text-sm">{L.txt}</p>
          <code className="block break-all text-sm" dir="ltr">
            _darb-verification.{d.hostname}
          </code>
          <code className="block break-all text-sm" dir="ltr">
            darb-rest={d.verification_token}
          </code>
          <form action={manageLaunch} className="space-y-3">
            {hidden}
            <input type="hidden" name="hostname" value={d.hostname} />
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="tls" value="ready" />
              {L.tls}
            </label>
            <div className="flex flex-wrap gap-2">
              {(["verify", "activate", "canonical", "deactivate", "remove"] as const).map((a) => (
                <button key={a} name="action" value={a} className={button}>
                  {L[a]}
                </button>
              ))}
            </div>
          </form>
        </section>
      ))}
    </div>
  );
}
