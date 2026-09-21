import { getCommercialPlans } from "@darb-rest/supabase/commercial";
import {
  CommercialApproval,
  ActionButton,
} from "../../../../../../components/platform/commercial-approval";
import { ActivationWorkflow } from "../../../../../../components/platform/activation-workflow";
import { activationLabels } from "@darb-rest/i18n";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  commercialLabels,
  getDictionary,
  LOCALE_CONFIGS,
  type SupportedLocale,
} from "@darb-rest/i18n";
import { requirePlatform, requireData } from "../../../../../../lib/platform";
import { commercialAction } from "../../../../../../lib/actions/customer-activation";
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
  const agreement = requireData(
    await db.from("customer_agreements").select("id").eq("application_id", id).maybeSingle(),
  );
  const plans = await getCommercialPlans();
  const C = commercialLabels[locale];
  const selected = plans.find((p) => p.code === r.requested_plan_code);
  const planLabel = (p: (typeof plans)[number]) =>
    `${p.name[locale] || p.name.en} · ${p.price_is_starting ? C.from + " " : ""}${new Intl.NumberFormat(locale, { style: "currency", currency: "ILS" }).format(p.monthly_price_ils)} / ${C.monthly}`;

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
          {s.result === "saved" || s.result === "sent"
            ? L.saved
            : s.result === "unavailable"
              ? activationLabels[locale].unavailable
              : s.result === "unknown"
                ? activationLabels[locale].unknown
                : L.reviewFailed}
        </p>
      )}
      <div className={`grid gap-6 ${!agreement || r.internal_note ? "lg:grid-cols-2" : ""}`}>
        <section className="space-y-5 rounded-xl border bg-[var(--bg-surface)] p-6">
          <h2 dir="auto" className="text-2xl font-bold">
            {r.business_name}
          </h2>
          <p>
            {L[r.status]} · {r.kind === "inquiry" ? L.inquiries : L.applications}
          </p>
          <dl className="grid gap-4 sm:grid-cols-2">
            {[
              [L.full_name, r.full_name],
              [L.language, LOCALE_CONFIGS[r.locale].nativeName],
              [L.email, r.email],
              [L.phone, r.phone],
              [L.city, r.city],
              [L.business_type, r.business_type ? L[r.business_type] : null],
              [L.branch_count, r.branch_count?.toLocaleString(locale)],
              [
                L.requested_plan_code,
                selected ? planLabel(selected) : L[r.requested_plan_code ?? "unsure"],
              ],
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
        <section
          className="space-y-5 rounded-xl bg-[var(--warm-bone)] p-6"
          hidden={!!agreement && !r.internal_note}
        >
          <h2 className="text-xl font-bold">{L.review}</h2>
          {r.status !== "rejected" && !agreement && (
            <>
              {r.kind === "application" && (
                <CommercialApproval plans={plans} id={id} locale={locale} selected={selected?.id} />
              )}
              <form action={commercialAction} className="grid gap-4 border-t pt-5">
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="id" value={id} />
                <input type="hidden" name="action" value="reject" />
                <label className="grid gap-2">
                  {activationLabels[locale].safeMessage}
                  <textarea name="safeMessage" maxLength={1000} className="rounded-lg border p-3" />
                </label>
                <label className="grid gap-2">
                  {L.internal_note}
                  <textarea name="note" maxLength={2000} className="rounded-lg border p-3" />
                </label>
                <ActionButton label={L.reject} />
              </form>
            </>
          )}
          <p dir="auto" className="whitespace-pre-wrap">
            {r.internal_note}
          </p>
        </section>
      </div>
      <ActivationWorkflow applicationId={id} locale={locale} />
    </>
  );
}
