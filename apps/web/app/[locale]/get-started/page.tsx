import { getCommercialPlans } from "@darb-rest/supabase/commercial";
import Link from "next/link";
import { getDictionary, type SupportedLocale } from "@darb-rest/i18n";
import { requestedPlanSchema } from "@darb-rest/validation";
import { Header } from "../../../components/header";
import { Footer } from "../../../components/footer";
import { AcquisitionForm } from "../../../components/acquisition-form";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: SupportedLocale }>;
}) {
  const { locale } = await params;
  return { title: getDictionary(locale).acquisition.title };
}
export default async function GetStarted({
  params,
  searchParams,
}: {
  params: Promise<{ locale: SupportedLocale }>;
  searchParams: Promise<{ plan?: string }>;
}) {
  const { locale } = await params,
    query = await searchParams,
    L = getDictionary(locale).acquisition;
  const plans = await getCommercialPlans();
  const plan = requestedPlanSchema.safeParse(query.plan);
  return (
    <>
      <Header solid />
      <main className="mx-auto max-w-6xl px-5 pb-16 pt-28 sm:px-8 sm:pt-36">
        <div className="grid items-start gap-9 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div className="space-y-5 lg:sticky lg:top-28">
            <p className="text-sm font-semibold text-[var(--color-primary)]">{L.eyebrow}</p>
            <h1 className="text-3xl font-bold leading-tight text-[var(--darb-green-deep)] sm:text-5xl">
              {L.title.split("Darb REST")[0]}
              <span lang="en" dir="ltr" className="inline-block whitespace-nowrap">
                Darb REST
              </span>
              {L.title.split("Darb REST")[1]}
            </h1>
            <p className="max-w-md leading-relaxed text-[var(--fg-muted)]">{L.intro}</p>
            <Link
              className="inline-flex min-h-11 items-center text-sm underline"
              href={`/${locale}/contact`}
            >
              {L.contactLink}
            </Link>
          </div>
          <div className="rounded-xl bg-[var(--warm-bone)] p-5 sm:p-8">
            <AcquisitionForm
              locale={locale}
              plans={plans}
              plan={plan.success && plans.some((p) => p.code === plan.data) ? plan.data : "unsure"}
            />
          </div>
        </div>
      </main>
      <Footer locale={locale} />
    </>
  );
}
