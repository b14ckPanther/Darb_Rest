import React from "react";
import { cookies } from "next/headers";
import { resolveTenantContext } from "../../../../lib/tenant-resolver";
import { getServerClient } from "@darb-rest/supabase/server";
import { BusinessSettingsForm } from "../../../../components/business-settings-form";
import { EmptyState, Button } from "@darb-rest/ui";
import { IconBuilding, IconPlus } from "@darb-rest/icons";
import {
  getDictionary,
  type SupportedLocale,
  isValidLocale,
  DEFAULT_LOCALE,
} from "@darb-rest/i18n";
import Link from "next/link";

declare global {
  var __DARB_REST_DEV_SETTINGS__: Map<string, Record<string, unknown>> | undefined;
}

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
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

  interface RawSettingsRow {
    primary_color?: string;
    accent_color?: string;
    phone_public?: string;
    email_public?: string;
    website_url?: string;
    instagram_url?: string;
    facebook_url?: string;
  }

  let initialSettings: {
    primaryColor?: string;
    accentColor?: string;
    phonePublic?: string;
    emailPublic?: string;
    websiteUrl?: string;
    instagramUrl?: string;
    facebookUrl?: string;
  } | null = null;

  const cookieStore = await cookies();
  const isDevSession =
    process.env.NODE_ENV !== "production" &&
    Boolean(cookieStore.get("darb_rest_dev_session")?.value);

  if (isDevSession) {
    const devSaved = globalThis.__DARB_REST_DEV_SETTINGS__?.get(context.activeBusiness.id);
    if (devSaved) {
      initialSettings = {
        primaryColor: (devSaved.primaryColor as string) || undefined,
        accentColor: (devSaved.accentColor as string) || undefined,
        phonePublic: (devSaved.phonePublic as string) || undefined,
        emailPublic: (devSaved.emailPublic as string) || undefined,
        websiteUrl: (devSaved.websiteUrl as string) || undefined,
        instagramUrl: (devSaved.instagramUrl as string) || undefined,
        facebookUrl: (devSaved.facebookUrl as string) || undefined,
      };
    }
  } else {
    try {
      const supabase = await getServerClient();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const { data: settingsRow } = await supabase
        .from("business_settings")
        .select(
          "primary_color, accent_color, phone_public, email_public, website_url, instagram_url, facebook_url",
        )
        .eq("business_id", context.activeBusiness.id)
        .abortSignal(controller.signal)
        .maybeSingle();

      clearTimeout(timeoutId);

      if (settingsRow) {
        const row = settingsRow as unknown as RawSettingsRow;
        initialSettings = {
          primaryColor: row.primary_color,
          accentColor: row.accent_color,
          phonePublic: row.phone_public,
          emailPublic: row.email_public,
          websiteUrl: row.website_url,
          instagramUrl: row.instagram_url,
          facebookUrl: row.facebook_url,
        };
      }
    } catch {
      // Graceful fallback if database offline or timed out
    }
  }

  return (
    <BusinessSettingsForm
      business={context.activeBusiness}
      userRole={context.activeMembership?.role || "staff"}
      initialSettings={initialSettings}
    />
  );
}
