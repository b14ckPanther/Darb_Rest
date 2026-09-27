import { getCommercialPlans } from "@darb-rest/supabase/commercial";
import { commercialLabels, type SupportedLocale } from "@darb-rest/i18n";
import { CommercialPricing } from "./commercial-pricing";

export async function PlansTeaser({ locale }: { locale: SupportedLocale }) {
  const plans = await getCommercialPlans(),
    L = commercialLabels[locale];

  return (
    <section
      id="plans"
      className="rs-route rs-route--canvas rs-section"
      aria-labelledby="rs-plans-title"
    >
      <div className="rs-rail rs-rail--waypoint" aria-hidden="true" />
      <div className="rs-shell rs-shell--railed">
        <h2 id="rs-plans-title" className="rs-heading rs-plans__title">
          {L.title}
        </h2>
        <CommercialPricing plans={plans} locale={locale} />
      </div>
    </section>
  );
}
