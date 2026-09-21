import { getServerClient } from "@darb-rest/supabase/server";
import { customerAgreement } from "../../../../lib/customer-activation";
import { platformRole } from "../../../../lib/auth";
import { activationLabels } from "@darb-rest/i18n";
import Link from "next/link";
import { localizedJson } from "@darb-rest/supabase/customer-mail";
import { getCommercialPlans } from "@darb-rest/supabase/commercial";
import React from "react";
import { getOnboardingDraft } from "../../../../lib/actions/onboarding";
import { OnboardingWizard, type PlanItem } from "../../../../components/onboarding-wizard";
import {
  isValidLocale,
  DEFAULT_LOCALE,
  type SupportedLocale,
  getDictionary,
} from "@darb-rest/i18n";

export default async function OnboardingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const currentLocale = (isValidLocale(locale) ? locale : DEFAULT_LOCALE) as SupportedLocale;
  const dict = getDictionary(currentLocale);

  // 1. Retrieve draft if present
  let initialDraft = await getOnboardingDraft();

  let availablePlans: PlanItem[] = (await getCommercialPlans()).map((p) => ({
    ...p,
    description: p.description ?? {},
    features: p.public_features,
  }));

  const auth = await (await getServerClient()).auth.getUser();
  let lockedAgreement:
    { name: string; cycle: "monthly" | "yearly"; amount: number; reference: string } | undefined;
  if (auth.data.user && !(await platformRole(auth.data.user.id)).data) {
    const record = await customerAgreement(auth.data.user.id);
    if (!record?.activation.activated_at)
      return (
        <div className="mx-auto max-w-lg space-y-5 p-6">
          <p>{activationLabels[currentLocale].requiredActivation}</p>
          <Link
            className="inline-flex min-h-12 underline"
            href={`/${currentLocale}/auth/accept-invite`}
          >
            {activationLabels[currentLocale].activate}
          </Link>
        </div>
      );
    const a = record.agreement;
    lockedAgreement = {
      name: localizedJson(a.plan_name, currentLocale),
      cycle: a.billing_cycle as "monthly" | "yearly",
      amount: a.agreed_amount_ils,
      reference: a.payment_reference,
    };
    initialDraft = { ...initialDraft, planId: a.plan_id };
    availablePlans = [
      {
        id: a.plan_id,
        code: a.plan_code,
        name: {
          en: localizedJson(a.plan_name, "en"),
          ar: localizedJson(a.plan_name, "ar"),
          he: localizedJson(a.plan_name, "he"),
        },
        monthly_price_ils: 0,
        yearly_price_ils: 0,
        price_is_starting: false,
        features: [],
      },
    ];
  }
  return (
    <div className="py-4 max-w-4xl mx-auto">
      <div className="mb-6 text-center sm:text-start">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--fg-default)]">
          {dict.onboarding.pageTitle}
        </h1>
        <p className="text-sm text-[var(--fg-muted)] mt-1.5">{dict.onboarding.pageSubtitle}</p>
      </div>

      <OnboardingWizard
        lockedAgreement={lockedAgreement}
        initialDraft={initialDraft}
        availablePlans={availablePlans}
        userLocale={currentLocale}
      />
    </div>
  );
}
