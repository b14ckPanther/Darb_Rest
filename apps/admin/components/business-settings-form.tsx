"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslation, type SupportedLocale } from "@darb-rest/i18n";
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
} from "@darb-rest/ui";
import {
  IconBuilding,
  IconCheck,
  IconWarning,
  IconLock,
  IconGlobe,
  IconPhone,
} from "@darb-rest/icons";
import { updateBusinessInfoAction, updateBusinessSettingsAction } from "../lib/actions/settings";
import type { Business, TenantRole } from "@darb-rest/types";

export interface BusinessSettingsFormProps {
  business: Business;
  userRole: TenantRole;
  initialSettings?: {
    primaryColor?: string;
    accentColor?: string;
    phonePublic?: string;
    emailPublic?: string;
    websiteUrl?: string;
    instagramUrl?: string;
    facebookUrl?: string;
  } | null;
}

export function BusinessSettingsForm({
  business,
  userRole,
  initialSettings,
}: BusinessSettingsFormProps) {
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isEditable = ["owner", "admin"].includes(userRole);

  // Identity Form State
  const [nameAr, setNameAr] = useState(business.name.ar || "");
  const [nameHe, setNameHe] = useState(business.name.he || "");
  const [nameEn, setNameEn] = useState(business.name.en || "");
  const [legalName, setLegalName] = useState(business.legalName || "");
  const [businessType, setBusinessType] = useState(business.businessType);

  // Language & Region State
  const [defaultLocale, setDefaultLocale] = useState<SupportedLocale>(business.defaultLocale);
  const [timezone, setTimezone] = useState(business.timezone);
  const [currency, setCurrency] = useState(business.currency);

  // Branding & Contact State
  const [phonePublic, setPhonePublic] = useState(initialSettings?.phonePublic || "");
  const [emailPublic, setEmailPublic] = useState(initialSettings?.emailPublic || "");
  const [websiteUrl, setWebsiteUrl] = useState(initialSettings?.websiteUrl || "");
  const [instagramUrl, setInstagramUrl] = useState(initialSettings?.instagramUrl || "");
  const [facebookUrl, setFacebookUrl] = useState(initialSettings?.facebookUrl || "");

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditable) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      // 1. Update business core info
      const infoRes = await updateBusinessInfoAction({
        name: {
          ar: nameAr,
          he: nameHe,
          en: nameEn,
        },
        legalName: legalName || undefined,
        type: businessType,
        defaultLocale,
        timezone,
        currency,
      });

      if (!infoRes.success) {
        setErrorMessage(infoRes.error || t("common.error"));
        return;
      }

      // 2. Update business branding and contact
      const settingsRes = await updateBusinessSettingsAction({
        phonePublic: phonePublic || undefined,
        emailPublic: emailPublic || undefined,
        websiteUrl: websiteUrl || undefined,
        instagramUrl: instagramUrl || undefined,
        facebookUrl: facebookUrl || undefined,
      });

      if (!settingsRes.success) {
        setErrorMessage(settingsRes.error || t("common.error"));
        return;
      }

      setSuccessMessage(t("settings.savedSuccess"));
      router.refresh();
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Top Header with Sticky Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[var(--border-subtle)]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--fg-default)]">
              {t("settings.title")}
            </h1>
            <Badge variant="primary" className="uppercase text-[10px] font-semibold" lang="en">
              {userRole}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-[var(--fg-muted)] mt-1">{t("settings.subtitle")}</p>
        </div>

        {isEditable && (
          <Button type="submit" variant="primary" size="md" isLoading={isPending}>
            {isPending ? t("settings.saving") : t("settings.saveChanges")}
          </Button>
        )}
      </div>

      {!isEditable && (
        <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface-elevated)] p-4 text-xs text-[var(--fg-muted)] flex items-center gap-2.5 shadow-xs">
          <IconLock size={16} className="text-[var(--fg-muted)] shrink-0" />
          <span>{t("settings.roleNotice")}</span>
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-[var(--color-success)]/40 bg-[var(--color-success-bg)] p-4 text-xs text-[var(--color-success)] flex items-center gap-2.5 shadow-xs">
          <IconCheck size={16} />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-[var(--color-destructive)]/40 bg-[var(--color-destructive-bg)] p-4 text-xs text-[var(--color-destructive)] flex items-center gap-2.5 shadow-xs">
          <IconWarning size={16} />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {/* 1. Identity Section */}
      <Card className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
              <IconBuilding size={18} />
            </div>
            <div>
              <CardTitle className="text-base font-bold">{t("settings.identitySection")}</CardTitle>
              <CardDescription className="text-xs mt-0.5" dir="ltr" lang="en">
                rest.darb.co.il/{business.slug}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--fg-default)]">
                {t("onboarding.arabicName")}
              </label>
              <Input
                dir="rtl"
                lang="ar"
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                disabled={!isEditable}
                placeholder="مثال: مطعم درب"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--fg-default)]">
                {t("onboarding.hebrewName")}
              </label>
              <Input
                dir="rtl"
                lang="he"
                value={nameHe}
                onChange={(e) => setNameHe(e.target.value)}
                disabled={!isEditable}
                placeholder="לדוגמה: מסעדת דרב"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--fg-default)]">
                {t("onboarding.englishName")}
              </label>
              <Input
                dir="ltr"
                lang="en"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                disabled={!isEditable}
                placeholder="e.g. Darb Restaurant"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs text-[var(--fg-muted)] font-medium">
                {t("onboarding.legalName")}
              </label>
              <Input
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                disabled={!isEditable}
                placeholder="Legal Business Entity Ltd."
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-[var(--fg-muted)] font-medium">
                {t("onboarding.businessType")}
              </label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value as "restaurant" | "cafe")}
                disabled={!isEditable}
                className="w-full h-10 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-xs text-[var(--fg-default)] focus:outline-none focus:border-[var(--color-primary)]"
              >
                <option value="restaurant">{t("onboarding.typeRestaurant")}</option>
                <option value="cafe">{t("onboarding.typeCafe")}</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Language & Region Section */}
      <Card className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
              <IconGlobe size={18} />
            </div>
            <div>
              <CardTitle className="text-base font-bold">{t("onboarding.step2.title")}</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {t("onboarding.step2.desc")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--fg-default)]">
                {t("onboarding.defaultLocale")}
              </label>
              <select
                value={defaultLocale}
                onChange={(e) => setDefaultLocale(e.target.value as SupportedLocale)}
                disabled={!isEditable}
                className="w-full h-10 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-xs text-[var(--fg-default)] focus:outline-none focus:border-[var(--color-primary)]"
              >
                <option lang="ar" value="ar">
                  العربية (Arabic)
                </option>
                <option lang="he" value="he">
                  עברית (Hebrew)
                </option>
                <option lang="en" value="en">
                  English
                </option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--fg-default)]">
                {t("onboarding.timezone")}
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                disabled={!isEditable}
                className="w-full h-10 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-xs text-[var(--fg-default)] focus:outline-none focus:border-[var(--color-primary)]"
              >
                <option value="Asia/Jerusalem">Asia/Jerusalem (UTC+02/03)</option>
                <option value="UTC">UTC</option>
                <option value="Europe/London">Europe/London</option>
                <option value="America/New_York">America/New_York</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--fg-default)]">
                {t("onboarding.currency")}
              </label>
              <Input
                dir="ltr"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                disabled={!isEditable}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {isEditable && (
        <Card className="p-5">
          <p>{t("appearance.brandingHome")}</p>
          <a
            className="mt-3 inline-flex min-h-11 items-center underline"
            href={`/${locale}/appearance/templates`}
          >
            {t("appearance.title")} · {t("appearance.templates")}
          </a>
        </Card>
      )}

      {/* 4. Public Contact Section */}
      <Card className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
              <IconPhone size={18} />
            </div>
            <div>
              <CardTitle className="text-base font-bold">{t("settings.contactSection")}</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {t("onboarding.contactTitle")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-xs text-[var(--fg-muted)] font-medium">
                {t("onboarding.phone")}
              </label>
              <Input
                dir="ltr"
                value={phonePublic}
                onChange={(e) => setPhonePublic(e.target.value)}
                disabled={!isEditable}
                placeholder="+972 ..."
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-[var(--fg-muted)] font-medium">
                {t("onboarding.email")}
              </label>
              <Input
                dir="ltr"
                value={emailPublic}
                onChange={(e) => setEmailPublic(e.target.value)}
                disabled={!isEditable}
                placeholder="contact@restaurant.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="space-y-1.5">
              <label className="text-xs text-[var(--fg-muted)] font-medium">
                {t("onboarding.website")}
              </label>
              <Input
                dir="ltr"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                disabled={!isEditable}
                placeholder="https://restaurant.com"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-[var(--fg-muted)] font-medium">
                {t("onboarding.instagram")}
              </label>
              <Input
                dir="ltr"
                value={instagramUrl}
                onChange={(e) => setInstagramUrl(e.target.value)}
                disabled={!isEditable}
                placeholder="@restaurant"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-[var(--fg-muted)] font-medium">
                {t("onboarding.facebook")}
              </label>
              <Input
                dir="ltr"
                value={facebookUrl}
                onChange={(e) => setFacebookUrl(e.target.value)}
                disabled={!isEditable}
                placeholder="fb.com/restaurant"
              />
            </div>
          </div>
        </CardContent>

        {isEditable && (
          <CardFooter className="flex justify-end border-t border-[var(--border-subtle)] pt-4 px-6">
            <Button type="submit" variant="primary" size="md" isLoading={isPending}>
              {t("settings.saveChanges")}
            </Button>
          </CardFooter>
        )}
      </Card>
    </form>
  );
}
