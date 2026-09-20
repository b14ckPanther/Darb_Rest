import React from "react";
import { redirect } from "next/navigation";
import { resolveTenantContext } from "../../../lib/tenant-resolver";
import {
  isValidLocale,
  DEFAULT_LOCALE,
  type SupportedLocale,
  getDictionary,
} from "@darb-rest/i18n";
import { BrandLogo } from "@darb-rest/ui";
import { LocaleSwitcher } from "../../../components/locale-switcher";
import { IconLogOut, IconUser } from "@darb-rest/icons";

export default async function OnboardingLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const currentLocale = (isValidLocale(locale) ? locale : DEFAULT_LOCALE) as SupportedLocale;
  const dict = getDictionary(currentLocale);

  const tenantContext = await resolveTenantContext();

  // Route Guard: user must be authenticated
  if (!tenantContext || !tenantContext.user) {
    redirect(`/${currentLocale}/auth/signin`);
  }

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--fg-default)] flex flex-col">
      {/* Top Focused Header */}
      <header className="h-16 border-b border-[var(--border-default)] bg-[var(--bg-surface)] px-4 sm:px-8 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <BrandLogo markSize={26} />
          <span className="hidden sm:inline-block text-xs font-semibold px-2 py-0.5 rounded-[var(--radius-sm)] bg-[var(--color-primary-bg)] text-[var(--color-primary)]">
            {dict.onboarding.pageTitle}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <LocaleSwitcher currentLocale={currentLocale} />

          <div className="hidden md:flex items-center gap-1.5 text-xs text-[var(--fg-muted)] border-s border-[var(--border-subtle)] ps-3">
            <IconUser size={13} />
            <span className="truncate max-w-[140px]">{tenantContext.user.email}</span>
          </div>

          <a
            href="/auth/signout"
            className="flex items-center gap-1 text-xs text-[var(--fg-muted)] hover:text-[var(--color-destructive)] transition-colors ms-1 cursor-pointer"
            title={dict.auth.signOut}
          >
            <IconLogOut size={15} />
            <span className="hidden sm:inline">{dict.auth.signOut}</span>
          </a>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-8">{children}</main>
    </div>
  );
}
