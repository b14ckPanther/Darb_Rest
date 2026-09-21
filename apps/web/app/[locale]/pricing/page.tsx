import { getCommercialPlans } from "@darb-rest/supabase/commercial";
import { commercialLabels, type SupportedLocale } from "@darb-rest/i18n";
import { Header } from "../../../components/header";
import { Footer } from "../../../components/footer";
import { CommercialPricing } from "../../../components/commercial-pricing";
export const dynamic = "force-dynamic";
export default async function Pricing({
  params,
}: {
  params: Promise<{ locale: SupportedLocale }>;
}) {
  const { locale } = await params,
    L = commercialLabels[locale],
    plans = await getCommercialPlans();
  return (
    <>
      <Header solid />
      <main className="mx-auto max-w-7xl px-5 pb-20 pt-32 sm:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h1 className="text-3xl font-bold sm:text-5xl">{L.title}</h1>
          <p className="mt-5 leading-relaxed">{L.intro}</p>
        </div>
        <CommercialPricing plans={plans} locale={locale} />
      </main>
      <Footer locale={locale} />
    </>
  );
}
