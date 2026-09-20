import { HomeScrollRestoration } from "../../components/home-scroll-restoration";
import React from "react";
import type { SupportedLocale } from "@darb-rest/i18n";
import { Header } from "../../components/header";
import { Hero } from "../../components/hero";
import { ValueSection } from "../../components/value-section";
import { ExperienceSection } from "../../components/experience-section";
import { CustomizationSection } from "../../components/customization-section";
import { MultiBranchSection } from "../../components/multi-branch-section";
import { MenuPreviewSection } from "../../components/menu-preview-section";
import { PlansTeaser } from "../../components/plans-teaser";
import { FinalCta } from "../../components/final-cta";
import { Footer } from "../../components/footer";
import { RevealProvider } from "../../components/reveal-provider";

export default async function WebHomePage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale }>;
}) {
  const { locale } = await params;

  return (
    <>
      <Header />
      <main>
        <Hero locale={locale} />
        <RevealProvider>
          <ValueSection locale={locale} />
          <ExperienceSection locale={locale} />
          <CustomizationSection locale={locale} />
          <MultiBranchSection locale={locale} />
          <MenuPreviewSection locale={locale} />
          <PlansTeaser locale={locale} />
          <FinalCta locale={locale} />
        </RevealProvider>
      </main>
      <Footer locale={locale} />
      <HomeScrollRestoration />
    </>
  );
}
