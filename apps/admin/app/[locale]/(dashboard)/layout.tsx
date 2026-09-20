import React from "react";
import { redirect } from "next/navigation";
import { resolveTenantContext } from "../../../lib/tenant-resolver";
import { TenantProvider } from "../../../components/tenant-context";
import { AdminShell } from "../../../components/admin-shell";
import { isValidLocale, DEFAULT_LOCALE, type SupportedLocale } from "@darb-rest/i18n";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const currentLocale = (isValidLocale(locale) ? locale : DEFAULT_LOCALE) as SupportedLocale;

  // Unbypassable Server-Side Route Protection:
  // Strictly validate authentication and memberships before rendering any dashboard shell
  const tenantContext = await resolveTenantContext();

  if (!tenantContext || !tenantContext.user) {
    redirect(`/${currentLocale}/auth/signin`);
  }

  return (
    <TenantProvider value={tenantContext}>
      <AdminShell>{children}</AdminShell>
    </TenantProvider>
  );
}
