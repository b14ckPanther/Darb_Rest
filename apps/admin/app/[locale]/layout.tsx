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
    ar: "درب ريست | إدارة المطاعم والمقاهي",
    he: "דרב רסט | ניהול מסעדות ובתי קפה",
    en: "Darb REST | Restaurant & Café Management",
  };
  const descriptions = {
    ar: "إدارة المطاعم والمقاهي — لوحة تحكم درب ريست",
    he: "ניהול מסעדות ובתי קפה — לוח בקרה דרב רסט",
    en: "Restaurant & Café Management — Darb REST Console",
  };

  const currentLocale = (isValidLocale(locale) ? locale : DEFAULT_LOCALE) as SupportedLocale;

  return {
    title: titles[currentLocale],
    description: descriptions[currentLocale],
    icons: {
      icon: "/brand/darb-rest-favicon.png",
      apple: "/brand/apple-touch-icon.png",
    },
  };
}

export default async function AdminLocaleLayout({
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
      <body className="min-h-screen bg-[var(--bg-canvas)] text-[var(--fg-default)] transition-colors antialiased">
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
