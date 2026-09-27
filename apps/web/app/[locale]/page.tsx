import { HomeScrollRestoration } from "../../components/home-scroll-restoration";
import React, { Suspense } from "react";
import type { SupportedLocale } from "@darb-rest/i18n";
import { MarketingShell } from "../../components/marketing/marketing-shell";
import { Hero } from "../../components/hero";
import { ValueSection } from "../../components/value-section";
import { ExperienceSection } from "../../components/experience-section";
import { CustomizationSection } from "../../components/customization-section";
import { MultiBranchSection } from "../../components/multi-branch-section";
import { MenuPreviewSection } from "../../components/menu-preview-section";
import { PlansTeaser } from "../../components/plans-teaser";
import { FinalCta } from "../../components/final-cta";

export default async function WebHomePage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale }>;
}) {
  const { locale } = await params;

  return (
    <MarketingShell locale={locale} arrival>
      <main>
        <Hero locale={locale} />
        <ValueSection locale={locale} />
        <ExperienceSection locale={locale} />
        <CustomizationSection locale={locale} />
        <MultiBranchSection locale={locale} />
        <MenuPreviewSection locale={locale} />
        <Suspense
          fallback={
            <div className="rs-route rs-route--canvas rs-plans-pending" aria-hidden="true" />
          }
        >
          <PlansTeaser locale={locale} />
        </Suspense>
        <FinalCta locale={locale} />
      </main>
      <HomeScrollRestoration />
    </MarketingShell>
  );
}
