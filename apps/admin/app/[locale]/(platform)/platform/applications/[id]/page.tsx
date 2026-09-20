import { ReviewButtons } from "../../../../../../components/platform/review-buttons";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary, LOCALE_CONFIGS, type SupportedLocale } from "@darb-rest/i18n";
import { requirePlatform, requireData } from "../../../../../../lib/platform";
import { reviewApplication } from "../../../../../../lib/actions/applications";
export default async function Application({
  params,
  searchParams,
}: {
  params: Promise<{ locale: SupportedLocale; id: string }>;
  searchParams: Promise<{ result?: string }>;
}) {
  const { locale, id } = await params,
    { db } = await requirePlatform(locale),
    L = getDictionary(locale).acquisition,
    s = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const r = requireData(
    await db
      .from("restaurant_applications")
      .select(
        "id,kind,full_name,business_name,email,phone,city,business_type,branch_count,requested_plan_code,message,locale,status,reviewed_by,reviewed_at,internal_note,created_at",
      )
      .eq("id", id)
      .maybeSingle(),
  );
  if (!r) notFound();
  return (
    <>
      <Link
        href={`/${locale}/platform/applications`}
        className="inline-flex min-h-11 items-center underline"
      >
        {L.back}
      </Link>
      <h1 className="text-3xl font-bold">{L.details}</h1>
      {s.result && (
        <p role={s.result === "saved" ? "status" : "alert"}>
          {s.result === "saved" ? L.saved : L.reviewFailed}
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-5 rounded-xl border bg-[var(--bg-surface)] p-6">
          <h2 dir="auto" className="text-2xl font-bold">
            {r.business_name}
          </h2>
          <p>
            {L[r.status]} · {r.kind === "inquiry" ? L.inquiries : L.applications}
          </p>
          <dl className="grid gap-4">
            {[
              [L.full_name, r.full_name],
              [L.language, LOCALE_CONFIGS[r.locale].nativeName],
              [L.email, r.email],
              [L.phone, r.phone],
              [L.city, r.city],
              [L.business_type, r.business_type ? L[r.business_type] : null],
              [L.branch_count, r.branch_count?.toLocaleString(locale)],
              [L.requested_plan_code, L[r.requested_plan_code ?? "unsure"]],
              [L.message, r.message],
              [L.created, new Date(r.created_at).toLocaleString(locale)],
              [L.reviewed, r.reviewed_at ? new Date(r.reviewed_at).toLocaleString(locale) : null],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-sm text-[var(--fg-muted)]">{label}</dt>
                <dd dir="auto" className="mt-1 whitespace-pre-wrap break-words">
                  {value || "—"}
                </dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="space-y-5 rounded-xl bg-[var(--warm-bone)] p-6">
          <h2 className="text-xl font-bold">{L.review}</h2>
          {r.status === "pending" ? (
            <form action={reviewApplication} className="space-y-5">
              <input type="hidden" name="locale" value={locale} />
              <input type="hidden" name="id" value={id} />
              <label className="grid gap-2">
                {L.requested_plan_code}
                <select
                  className="min-h-12 rounded-lg border bg-white px-3"
                  name="requested_plan_code"
                  defaultValue={r.requested_plan_code ?? "unsure"}
                >
                  {(["unsure", "starter", "pro", "enterprise"] as const).map((p) => (
                    <option key={p} value={p}>
                      {L[p]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-2">
                {L.internal_note}
                <textarea
                  name="internal_note"
                  rows={5}
                  maxLength={2000}
                  className="w-full rounded-lg border bg-white p-3"
                  dir="auto"
                />
              </label>
              <ReviewButtons approve={L.approve} reject={L.reject} sending={L.sending} />
            </form>
          ) : (
            <>
              <p>{L.internal_note}</p>
              <p dir="auto" className="whitespace-pre-wrap break-words">
                {r.internal_note || "—"}
              </p>
            </>
          )}
          <p className="text-sm leading-relaxed text-[var(--fg-muted)]">{L.inviteNotice}</p>
        </section>
      </div>
    </>
  );
}
