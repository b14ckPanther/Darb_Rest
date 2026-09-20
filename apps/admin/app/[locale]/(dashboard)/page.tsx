import React from "react";
import Link from "next/link";
import { getDictionary, type SupportedLocale } from "@darb-rest/i18n";
import { resolveTenantContext } from "../../../lib/tenant-resolver";
import { Button, EmptyState } from "@darb-rest/ui";
import {
  IconBuilding,
  IconStore,
  IconSettings,
  IconCheck,
  IconClose,
  IconPlus,
} from "@darb-rest/icons";

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: SupportedLocale }>;
}) {
  const { locale } = await params;
  const dict = getDictionary(locale);
  const tenantContext = await resolveTenantContext();

  if (!tenantContext?.activeBusiness) {
    return (
      <div className="mx-auto max-w-lg py-16">
        <EmptyState
          icon={<IconBuilding size={32} />}
          title={dict.admin.noBusinessFound}
          description={dict.admin.noBusinessDesc}
          action={
            <div className="flex gap-3">
              <Link href={`/${locale}/onboarding`}>
                <Button variant="primary" size="sm" startIcon={<IconPlus size={14} />}>
                  {dict.admin.createFirstBusiness}
                </Button>
              </Link>
              <a href="/auth/signout">
                <Button variant="outline" size="sm">
                  {dict.auth.signOut}
                </Button>
              </a>
            </div>
          }
        />
      </div>
    );
  }

  const { activeBusiness, activeMembership, activeLocation, entitlements } = tenantContext;

  const businessName =
    typeof activeBusiness.name === "object"
      ? activeBusiness.name[locale] ||
        activeBusiness.name.en ||
        Object.values(activeBusiness.name)[0]
      : String(activeBusiness.name);

  const locationName = activeLocation
    ? typeof activeLocation.name === "object"
      ? activeLocation.name[locale] ||
        activeLocation.name.en ||
        Object.values(activeLocation.name)[0]
      : String(activeLocation.name)
    : dict.admin.allBranches;

  const planLabel = activeBusiness.planId ? "Pro" : "Starter";

  const features = [
    {
      label: dict.admin.featureDigitalMenu,
      enabled: true,
    },
    {
      label: dict.admin.featureQrCodes,
      enabled: true,
    },
    {
      label: dict.admin.featureMultiBranch,
      enabled: entitlements.multi_location.enabled,
      detail: entitlements.multi_location.enabled
        ? `${entitlements.multi_location.limitValue ?? "∞"}`
        : undefined,
    },
    {
      label: dict.admin.featureOnlineOrdering,
      enabled: entitlements.online_ordering.enabled,
    },
    {
      label: dict.admin.featureTableOrdering,
      enabled: entitlements.table_ordering.enabled,
    },
    {
      label: dict.admin.featureCustomBranding,
      enabled: entitlements.custom_branding.enabled,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-xl font-bold text-[var(--fg-default)] sm:text-2xl">{businessName}</h1>
          <span
            className="text-xs font-mono text-[var(--fg-muted)] bg-[var(--bg-surface-elevated)] px-2.5 py-0.5 rounded-[var(--radius-sm)]"
            dir="ltr"
            lang="en"
          >
            rest.darb.co.il/{activeBusiness.slug}
          </span>
        </div>
        <p className="mt-1 text-sm text-[var(--fg-muted)]">{dict.admin.subtitle}</p>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-[var(--radius-lg)] bg-[var(--bg-surface)] p-4 shadow-xs">
          <div className="text-xs font-medium text-[var(--fg-muted)]">
            {dict.admin.dashboardPlan}
          </div>
          <div className="mt-1 text-lg font-bold text-[var(--fg-default)]" lang="en">
            {planLabel}
          </div>
        </div>
        <div className="rounded-[var(--radius-lg)] bg-[var(--bg-surface)] p-4 shadow-xs">
          <div className="text-xs font-medium text-[var(--fg-muted)]">
            {dict.admin.dashboardBranches}
          </div>
          <div className="mt-1 text-lg font-bold text-[var(--fg-default)]">
            {tenantContext.availableLocations.length}
          </div>
        </div>
        <div className="rounded-[var(--radius-lg)] bg-[var(--bg-surface)] p-4 shadow-xs">
          <div className="text-xs font-medium text-[var(--fg-muted)]">
            {dict.admin.dashboardStatus}
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[var(--color-success)]" />
            <span className="text-sm font-semibold text-[var(--color-success)]">
              {dict.admin.dashboardActive}
            </span>
          </div>
        </div>
        <div className="rounded-[var(--radius-lg)] bg-[var(--bg-surface)] p-4 shadow-xs">
          <div className="text-xs font-medium text-[var(--fg-muted)]">{dict.admin.currentRole}</div>
          <div className="mt-1 text-sm font-semibold capitalize text-[var(--fg-default)]" lang="en">
            {activeMembership?.role || "Staff"}
          </div>
        </div>
      </div>

      {/* Active Branch + Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--darb-green-deep)]/10 text-[var(--darb-green-deep)]">
            <IconStore size={20} />
          </div>
          <div>
            <div className="text-sm font-semibold text-[var(--fg-default)]">{locationName}</div>
            <div className="text-xs text-[var(--fg-muted)]">
              {tenantContext.availableLocations.length > 1
                ? `${tenantContext.availableLocations.length} ${dict.admin.dashboardBranches.toLowerCase()}`
                : dict.locations.primaryBranch}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/${locale}/locations`}>
            <Button variant="outline" size="sm" startIcon={<IconBuilding size={14} />}>
              {dict.navigation.locations}
            </Button>
          </Link>
          <Link href={`/${locale}/settings`}>
            <Button variant="outline" size="sm" startIcon={<IconSettings size={14} />}>
              {dict.navigation.settings}
            </Button>
          </Link>
        </div>
      </div>

      {/* Plan Features */}
      <div>
        <h2 className="mb-4 text-base font-semibold text-[var(--fg-default)]">
          {dict.admin.planFeatures}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {features.map((feature) => (
            <div
              key={feature.label}
              className="rounded-[var(--radius-md)] bg-[var(--bg-surface)] p-3 shadow-xs"
            >
              <div className="text-xs font-medium text-[var(--fg-muted)]">{feature.label}</div>
              <div className="mt-1.5 flex items-center gap-1.5">
                {feature.enabled ? (
                  <>
                    <IconCheck size={14} className="text-[var(--color-success)]" />
                    <span className="text-xs font-semibold text-[var(--color-success)]">
                      {feature.detail || dict.admin.featureActive}
                    </span>
                  </>
                ) : (
                  <>
                    <IconClose size={14} className="text-[var(--fg-subtle)]" />
                    <span className="text-xs font-medium text-[var(--fg-subtle)]">
                      {dict.admin.featureLocked}
                    </span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
