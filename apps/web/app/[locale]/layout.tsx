import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getDirection,
  isValidLocale,
  I18nProvider,
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  type SupportedLocale,
} from "@darb-rest/i18n";
import { fontCairo, fontHeebo, fontUbuntu } from "../fonts";
import "../globals.css";

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const titles = {
    ar: "درب ريست | منصة رقمية للمطاعم والمقاهي",
    he: "דרב רסט | פלטפורמה דיגיטלית למסעדות ובתי קפה",
    en: "Darb REST | Digital Platform for Restaurants & Cafés",
  };
  const descriptions = {
    ar: "منيو رقمي أنيق، هوية واضحة، إدارة فروع مرتبة وتجربة أسهل لكل زبون — بالعربية والعبرية والإنجليزية.",
    he: "תפריט דיגיטלי מעוצב, זהות מותג ברורה, ניהול סניפים מסודר וחוויה נוחה יותר לכל אורח — בערבית, בעברית ובאנגלית.",
    en: "Beautiful digital menus, clear brand identity, organized locations, and a smoother experience for every guest.",
  };

  const currentLocale = (isValidLocale(locale) ? locale : DEFAULT_LOCALE) as SupportedLocale;

  return {
    title: titles[currentLocale],
    description: descriptions[currentLocale],
    metadataBase: new URL("https://rest.darb.co.il"),
    icons: {
      icon: "/brand/darb-rest-favicon.png",
      apple: "/brand/darb-rest-pwa-icon.png",
    },
    openGraph: {
      title: titles[currentLocale],
      description: descriptions[currentLocale],
      siteName: "Darb REST",
      locale: currentLocale,
      type: "website",
    },
    manifest: "/manifest.webmanifest",
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  const direction = getDirection(locale);

  // Determine primary font variable for active locale
  const activeFontVar =
    locale === "ar"
      ? "var(--font-cairo)"
      : locale === "he"
        ? "var(--font-heebo)"
        : "var(--font-ubuntu)";

  return (
    <html
      lang={locale}
      dir={direction}
      className={`${fontCairo.variable} ${fontHeebo.variable} ${fontUbuntu.variable}`}
      style={{ ["--font-active" as string]: activeFontVar }}
    >
      <body className="min-h-screen bg-[var(--warm-ivory)] text-[var(--fg-default)] antialiased">
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
