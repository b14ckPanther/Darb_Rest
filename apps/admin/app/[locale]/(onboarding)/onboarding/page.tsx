import { getServerClient } from "@darb-rest/supabase/server";
import { getAdminClient } from "@darb-rest/supabase/admin";
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

  const availablePlans: PlanItem[] = (await getCommercialPlans()).map((p) => ({
    ...p,
    description: p.description ?? {},
    features: p.public_features,
  }));

  const auth = await (await getServerClient()).auth.getUser();
  if (process.env.SUPABASE_SERVICE_ROLE_KEY && auth.data.user?.email && !initialDraft?.planId) {
    const approved = await getAdminClient()
      .from("restaurant_applications")
      .select("requested_plan_code")
      .eq("email", auth.data.user.email.toLowerCase())
      .eq("kind", "application")
      .eq("status", "approved")
      .order("reviewed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const plan = availablePlans.find((p) => p.code === approved.data?.requested_plan_code);
    if (plan) initialDraft = { ...initialDraft, planId: plan.id };
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
        initialDraft={initialDraft}
        availablePlans={availablePlans}
        userLocale={currentLocale}
      />
    </div>
  );
}
