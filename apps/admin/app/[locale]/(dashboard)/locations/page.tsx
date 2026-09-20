import React from "react";
import { resolveTenantContext } from "../../../../lib/tenant-resolver";
import { LocationsManager } from "../../../../components/locations-manager";
import { EmptyState, Button } from "@darb-rest/ui";
import { IconBuilding, IconPlus } from "@darb-rest/icons";
import {
  getDictionary,
  type SupportedLocale,
  isValidLocale,
  DEFAULT_LOCALE,
} from "@darb-rest/i18n";
import Link from "next/link";

export default async function LocationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const currentLocale = (isValidLocale(locale) ? locale : DEFAULT_LOCALE) as SupportedLocale;
  const dict = getDictionary(currentLocale);

  const context = await resolveTenantContext();

  if (!context?.activeBusiness) {
    return (
      <div className="max-w-xl mx-auto py-12">
        <EmptyState
          icon={<IconBuilding size={32} />}
          title={dict.admin.noBusinessFound}
          description={dict.admin.noBusinessDesc}
          action={
            <Link href={`/${currentLocale}/onboarding`}>
              <Button variant="primary" size="sm" startIcon={<IconPlus size={14} />}>
                {dict.admin.createFirstBusiness}
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <LocationsManager
      businessId={context.activeBusiness.id}
      businessSlug={context.activeBusiness.slug}
      userRole={context.activeMembership?.role || "staff"}
      locations={context.availableLocations}
      activeLocationId={context.activeLocation?.id || null}
      entitlements={context.entitlements}
    />
  );
}
