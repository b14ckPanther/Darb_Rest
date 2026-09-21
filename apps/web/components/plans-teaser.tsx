import { getCommercialPlans } from "@darb-rest/supabase/commercial";
import { commercialLabels, type SupportedLocale } from "@darb-rest/i18n";
import { CommercialPricing } from "./commercial-pricing";
export async function PlansTeaser({ locale }: { locale: SupportedLocale }) {
  const plans = await getCommercialPlans(),
    L = commercialLabels[locale];
  return (
    <section id="plans" className="px-5 py-16 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <h2 className="mb-8 text-center text-3xl font-bold">{L.title}</h2>
        <CommercialPricing plans={plans} locale={locale} />
      </div>
    </section>
  );
}
