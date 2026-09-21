"use client";
import { activationLabels, commercialLabels } from "@darb-rest/i18n";

import React, { useState, useEffect, useTransition } from "react";
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
  Stepper,
  type StepItem,
} from "@darb-rest/ui";
import {
  IconBuilding,
  IconRestaurant,
  IconCafe,
  IconClock,
  IconCheck,
  IconWarning,
  IconStore,
  IconSparkles,
  IconBranding,
} from "@darb-rest/icons";
import { ArrowStart, ArrowEnd } from "@darb-rest/icons";
import { normalizeSlug, isSlugAllowed, type CompleteOnboardingInput } from "@darb-rest/validation";
import {
  checkSlugAvailability,
  saveOnboardingDraft,
  clearOnboardingDraft,
  completeOnboarding,
} from "../lib/actions/onboarding";
import type { OnboardingDraft, BusinessType, DayOfWeek } from "@darb-rest/types";

export interface PlanItem {
  monthly_price_ils: number;
  yearly_price_ils: number;
  price_is_starting: boolean;
  id: string;
  code: string;
  name: Record<SupportedLocale, string>;
  description?: Record<SupportedLocale, string>;
  features: string[] | Record<SupportedLocale, string[]>;
}

export interface OnboardingWizardProps {
  lockedAgreement?: {
    name: string;
    cycle: "monthly" | "yearly";
    amount: number;
    reference: string;
  };
  initialDraft?: Partial<OnboardingDraft> | null;
  availablePlans: PlanItem[];
  userLocale: SupportedLocale;
}

const DEFAULT_HOURS = [
  { dayOfWeek: 1 as DayOfWeek, openTime: "08:00", closeTime: "22:00", isClosed: false },
  { dayOfWeek: 2 as DayOfWeek, openTime: "08:00", closeTime: "22:00", isClosed: false },
  { dayOfWeek: 3 as DayOfWeek, openTime: "08:00", closeTime: "22:00", isClosed: false },
  { dayOfWeek: 4 as DayOfWeek, openTime: "08:00", closeTime: "22:00", isClosed: false },
  { dayOfWeek: 5 as DayOfWeek, openTime: "08:00", closeTime: "23:00", isClosed: false },
  { dayOfWeek: 6 as DayOfWeek, openTime: "09:00", closeTime: "23:00", isClosed: false },
  { dayOfWeek: 7 as DayOfWeek, openTime: "10:00", closeTime: "21:00", isClosed: false },
];

export function OnboardingWizard({
  lockedAgreement,
  initialDraft,
  availablePlans,
  userLocale,
}: OnboardingWizardProps) {
  const { t, locale, direction } = useTranslation();
  const [isPending, startTransition] = useTransition();

  // Active step (1 to 7)
  const [currentStep, setCurrentStep] = useState(1);
  const [hasResumeNotice, setHasResumeNotice] = useState(
    Boolean(initialDraft && initialDraft.step && initialDraft.step > 1),
  );

  // Step 1: Business Identity
  const [businessName, setBusinessName] = useState({
    ar: initialDraft?.businessName?.ar || "",
    he: initialDraft?.businessName?.he || "",
    en: initialDraft?.businessName?.en || "",
  });
  const [legalName, setLegalName] = useState(initialDraft?.legalName || "");
  const [businessSlug, setBusinessSlug] = useState(initialDraft?.businessSlug || "");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(Boolean(initialDraft?.businessSlug));
  const [slugStatus, setSlugStatus] = useState<
    "idle" | "checking" | "available" | "unavailable" | "reserved"
  >("idle");

  // Step 2: Business Type & Locale
  const [businessType, setBusinessType] = useState<BusinessType>(
    initialDraft?.businessType || "restaurant",
  );
  const [defaultLocale, setDefaultLocale] = useState<SupportedLocale>(
    initialDraft?.defaultLocale || userLocale,
  );
  const [timezone, setTimezone] = useState(initialDraft?.timezone || "Asia/Jerusalem");
  const [currency, setCurrency] = useState(initialDraft?.currency || "ILS");

  // Step 3: Contact & Branding
  const [phonePublic, setPhonePublic] = useState(initialDraft?.phonePublic || "");
  const [emailPublic, setEmailPublic] = useState(initialDraft?.emailPublic || "");
  const [websiteUrl, setWebsiteUrl] = useState(initialDraft?.websiteUrl || "");
  const [instagramUrl, setInstagramUrl] = useState(initialDraft?.instagramUrl || "");
  const [facebookUrl, setFacebookUrl] = useState(initialDraft?.facebookUrl || "");
  const [primaryColor, setPrimaryColor] = useState(initialDraft?.primaryColor || "#d97706");
  const [accentColor, setAccentColor] = useState(initialDraft?.accentColor || "#0284c7");

  // Step 4: First Branch
  const [branchName, setBranchName] = useState({
    ar: initialDraft?.branchName?.ar || "",
    he: initialDraft?.branchName?.he || "",
    en: initialDraft?.branchName?.en || "",
  });
  const [branchSlug, setBranchSlug] = useState(initialDraft?.branchSlug || "main-branch");
  const [branchPhone, setBranchPhone] = useState(initialDraft?.branchPhone || "");
  const [branchEmail, setBranchEmail] = useState(initialDraft?.branchEmail || "");
  const [branchAddressLine1, setBranchAddressLine1] = useState(
    initialDraft?.branchAddressLine1 || "",
  );
  const [branchAddressLine2, setBranchAddressLine2] = useState(
    initialDraft?.branchAddressLine2 || "",
  );
  const [branchCity, setBranchCity] = useState(initialDraft?.branchCity || "");
  const [branchCountry, setBranchCountry] = useState(initialDraft?.branchCountry || "IL");

  // Step 5: Opening Hours
  const [operatingHours, setOperatingHours] = useState(
    initialDraft?.operatingHours || DEFAULT_HOURS,
  );

  // Step 6: Plan Selection
  const defaultPlanId = availablePlans[0]?.id || "";
  const [selectedPlanId, setSelectedPlanId] = useState(
    availablePlans.some((p) => p.id === initialDraft?.planId)
      ? initialDraft!.planId
      : defaultPlanId,
  );

  // Step 7: Creation state
  const [creationError, setCreationError] = useState<string | null>(null);
  const [creationSuccess, setCreationSuccess] = useState(false);

  // Validation errors per step
  const [stepError, setStepError] = useState<string | null>(null);

  // Auto-generate slug suggestion from entered name if not manually modified
  const handleNameChange = (lang: SupportedLocale, val: string) => {
    const updated = { ...businessName, [lang]: val };
    setBusinessName(updated);

    if (!slugManuallyEdited) {
      const source =
        updated.en || updated[userLocale] || Object.values(updated).find(Boolean) || "";
      const suggested = normalizeSlug(source);
      if (suggested) {
        setBusinessSlug(suggested);
      }
    }
  };

  // Debounced check for slug availability
  useEffect(() => {
    if (!businessSlug || businessSlug.length < 3) {
      setSlugStatus("idle");
      return;
    }

    const timer = setTimeout(async () => {
      setSlugStatus("checking");
      const res = await checkSlugAvailability(businessSlug);
      if (res.available) {
        setSlugStatus("available");
      } else if (res.reason === "reserved") {
        setSlugStatus("reserved");
      } else {
        setSlugStatus("unavailable");
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [businessSlug]);

  const handleResumeDraft = () => {
    if (initialDraft?.step) {
      setCurrentStep(initialDraft.step);
    }
    setHasResumeNotice(false);
  };

  const handleStartFresh = async () => {
    await clearOnboardingDraft();
    setHasResumeNotice(false);
  };

  const persistCurrentProgress = async (nextStep: number) => {
    try {
      const draftPayload: OnboardingDraft = {
        step: nextStep,
        businessName,
        legalName,
        businessSlug,
        businessType,
        defaultLocale,
        timezone,
        currency,
        phonePublic,
        emailPublic,
        websiteUrl,
        instagramUrl,
        facebookUrl,
        primaryColor,
        accentColor,
        branchName,
        branchSlug,
        branchPhone,
        branchEmail,
        branchAddressLine1,
        branchAddressLine2,
        branchCity,
        branchCountry,
        operatingHours,
        planId: selectedPlanId,
      };
      await saveOnboardingDraft(draftPayload);
    } catch {
      // Non-blocking draft persistence
    }
  };

  const validateAndAdvance = async () => {
    setStepError(null);

    if (currentStep === 1) {
      const hasAnyName = Boolean(
        businessName.ar.trim() || businessName.he.trim() || businessName.en.trim(),
      );
      if (!hasAnyName) {
        setStepError(t("validation.atLeastOneName"));
        return;
      }
      if (!isSlugAllowed(businessSlug)) {
        setStepError(t("validation.invalidSlug"));
        return;
      }
      if (slugStatus === "unavailable" || slugStatus === "reserved") {
        setStepError(t("onboarding.slugUnavailable"));
        return;
      }
    } else if (currentStep === 4) {
      const hasBranchName = Boolean(
        branchName.ar.trim() || branchName.he.trim() || branchName.en.trim(),
      );
      if (!hasBranchName) {
        setBranchName(businessName);
      }
      if (!branchAddressLine1.trim()) {
        setStepError(t("validation.required"));
        return;
      }
      if (!branchCity.trim()) {
        setStepError(t("validation.required"));
        return;
      }
    }

    const nextStep = currentStep + 1;
    await persistCurrentProgress(nextStep);
    setCurrentStep(nextStep);
  };

  const handleStepBack = () => {
    setStepError(null);
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCompleteOnboarding = () => {
    setCreationError(null);
    startTransition(async () => {
      const primaryLangName =
        businessName[userLocale] || Object.values(businessName).find(Boolean) || "";
      const normalizedBusinessName = {
        ar: businessName.ar || primaryLangName,
        he: businessName.he || primaryLangName,
        en: businessName.en || primaryLangName,
      };

      const primaryBranchName =
        branchName[userLocale] || Object.values(branchName).find(Boolean) || primaryLangName;
      const normalizedBranchName = {
        ar: branchName.ar || primaryBranchName,
        he: branchName.he || primaryBranchName,
        en: branchName.en || primaryBranchName,
      };

      const completePayload: CompleteOnboardingInput = {
        businessName: normalizedBusinessName,
        legalName: legalName || undefined,
        businessSlug: normalizeSlug(businessSlug),
        businessType,
        defaultLocale,
        timezone,
        currency,
        phonePublic: phonePublic || undefined,
        emailPublic: emailPublic || undefined,
        websiteUrl: websiteUrl || undefined,
        instagramUrl: instagramUrl || undefined,
        facebookUrl: facebookUrl || undefined,
        primaryColor,
        accentColor,
        branchName: normalizedBranchName,
        branchSlug: normalizeSlug(branchSlug) || "main-branch",
        branchPhone: branchPhone || undefined,
        branchEmail: branchEmail || undefined,
        branchAddressLine1,
        branchAddressLine2: branchAddressLine2 || undefined,
        branchCity,
        branchCountry,
        operatingHours,
        planId: selectedPlanId,
      };

      const res = await completeOnboarding(completePayload);
      if (res.success) {
        setCreationSuccess(true);
        setTimeout(() => {
          window.location.href = `/${locale}`;
        }, 800);
      } else {
        setCreationError(res.error || t("common.error"));
      }
    });
  };

  const stepperSteps: StepItem[] = [
    { id: 1, title: t("onboarding.step1.title"), description: t("onboarding.step1.desc") },
    { id: 2, title: t("onboarding.step2.title"), description: t("onboarding.step2.desc") },
    { id: 3, title: t("onboarding.step3.title"), description: t("onboarding.step3.desc") },
    { id: 4, title: t("onboarding.step4.title"), description: t("onboarding.step4.desc") },
    { id: 5, title: t("onboarding.step5.title"), description: t("onboarding.step5.desc") },
    { id: 6, title: t("onboarding.step6.title"), description: t("onboarding.step6.desc") },
    { id: 7, title: t("onboarding.step7.title"), description: t("onboarding.step7.desc") },
  ];

  return (
    <div className="space-y-6">
      {/* Resume Incomplete Setup Alert */}
      {hasResumeNotice && (
        <div className="rounded-xl border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2.5">
            <IconSparkles size={18} className="text-[var(--color-primary)] shrink-0" />
            <p className="text-xs sm:text-sm font-medium text-[var(--fg-default)]">
              {t("onboarding.resumeNotice")}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" variant="primary" onClick={handleResumeDraft}>
              {t("onboarding.resumeButton")}
            </Button>
            <Button size="sm" variant="outline" onClick={handleStartFresh}>
              {t("onboarding.startFresh")}
            </Button>
          </div>
        </div>
      )}

      {/* Main Stepper */}
      <Card className="border-[var(--border-default)] bg-[var(--bg-surface)] p-3 sm:p-4 shadow-xs">
        <Stepper
          steps={stepperSteps}
          currentStep={currentStep}
          onStepClick={(step) => {
            if (step < currentStep) setCurrentStep(step);
          }}
        />
      </Card>

      {/* Active Step Container */}
      <Card className="border-[var(--border-default)] bg-[var(--bg-surface)] shadow-sm">
        {/* Step 1: Business Identity */}
        {currentStep === 1 && (
          <>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  <IconBuilding size={18} />
                </div>
                <div>
                  <CardTitle className="text-lg">{t("onboarding.step1.title")}</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {t("onboarding.pageSubtitle")}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--fg-default)]">
                  {t("onboarding.businessName")} ({t("common.language")}: {userLocale.toUpperCase()}
                  ) *
                </label>
                <Input
                  value={businessName[userLocale]}
                  onChange={(e) => handleNameChange(userLocale, e.target.value)}
                  placeholder={t("onboarding.businessNamePlaceholder")}
                  autoFocus
                />
              </div>

              {/* Multilingual Names */}
              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-4 space-y-3">
                <span className="text-[11px] font-semibold text-[var(--fg-muted)] uppercase tracking-wider block">
                  {userLocale === "ar"
                    ? "أسماء المنيو بلغات أخرى (اختياري)"
                    : userLocale === "he"
                      ? "שמות התפריט בשפות נוספות (אופציונלי)"
                      : "Multilingual Public Names (Optional)"}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {userLocale !== "ar" && (
                    <div className="space-y-1">
                      <label className="text-xs text-[var(--fg-muted)] font-medium">
                        {t("onboarding.arabicName")}
                      </label>
                      <Input
                        dir="rtl"
                        lang="ar"
                        value={businessName.ar}
                        onChange={(e) => handleNameChange("ar", e.target.value)}
                        placeholder="مثال: درب بيسترو"
                      />
                    </div>
                  )}
                  {userLocale !== "he" && (
                    <div className="space-y-1">
                      <label className="text-xs text-[var(--fg-muted)] font-medium">
                        {t("onboarding.hebrewName")}
                      </label>
                      <Input
                        dir="rtl"
                        lang="he"
                        value={businessName.he}
                        onChange={(e) => handleNameChange("he", e.target.value)}
                        placeholder="לדוגמה: דרב ביסטרו"
                      />
                    </div>
                  )}
                  {userLocale !== "en" && (
                    <div className="space-y-1">
                      <label className="text-xs text-[var(--fg-muted)] font-medium">
                        {t("onboarding.englishName")}
                      </label>
                      <Input
                        dir="ltr"
                        lang="en"
                        value={businessName.en}
                        onChange={(e) => handleNameChange("en", e.target.value)}
                        placeholder="e.g. Darb Bistro"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Slug Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[var(--fg-default)]">
                    {t("onboarding.slug")} *
                  </label>
                  <span className="text-[11px] text-[var(--fg-muted)]" dir="ltr">
                    rest.darb.co.il/
                    <strong className="text-[var(--color-primary)]">{businessSlug || "..."}</strong>
                  </span>
                </div>
                <Input
                  dir="ltr"
                  value={businessSlug}
                  onChange={(e) => {
                    setSlugManuallyEdited(true);
                    setBusinessSlug(normalizeSlug(e.target.value));
                  }}
                  placeholder={t("onboarding.slugPlaceholder")}
                />
                <div className="flex items-center gap-1.5 text-xs pt-0.5">
                  {slugStatus === "checking" && (
                    <span className="text-[var(--fg-muted)]">{t("onboarding.slugChecking")}</span>
                  )}
                  {slugStatus === "available" && (
                    <span className="text-[var(--color-success)] flex items-center gap-1 font-medium">
                      <IconCheck size={13} />
                      {t("onboarding.slugAvailable")}
                    </span>
                  )}
                  {slugStatus === "reserved" && (
                    <span className="text-[var(--color-destructive)] flex items-center gap-1 font-medium">
                      <IconWarning size={13} />
                      {t("onboarding.slugReserved")}
                    </span>
                  )}
                  {slugStatus === "unavailable" && (
                    <span className="text-[var(--color-destructive)] flex items-center gap-1 font-medium">
                      <IconWarning size={13} />
                      {t("onboarding.slugUnavailable")}
                    </span>
                  )}
                </div>
              </div>

              {/* Legal Entity Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--fg-muted)]">
                  {t("onboarding.legalName")}
                </label>
                <Input
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder={t("onboarding.legalNamePlaceholder")}
                />
              </div>
            </CardContent>
          </>
        )}

        {/* Step 2: Business Type & Locale */}
        {currentStep === 2 && (
          <>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  <IconRestaurant size={18} />
                </div>
                <div>
                  <CardTitle className="text-lg">{t("onboarding.step2.title")}</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {t("onboarding.step2.desc")}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Restaurant vs Café Type Cards */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[var(--fg-default)]">
                  {t("onboarding.businessType")} *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div
                    onClick={() => setBusinessType("restaurant")}
                    className={`cursor-pointer rounded-xl border p-4.5 transition-all ${
                      businessType === "restaurant"
                        ? "border-2 border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-xs"
                        : "border-[var(--border-default)] bg-[var(--bg-surface-elevated)] hover:border-[var(--border-hover)]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                          <IconRestaurant size={20} />
                        </div>
                        <span className="text-sm font-bold text-[var(--fg-default)]">
                          {t("onboarding.typeRestaurant")}
                        </span>
                      </div>
                      {businessType === "restaurant" && (
                        <div className="h-5 w-5 rounded-full bg-[var(--color-primary)] text-[var(--color-primary-fg)] flex items-center justify-center">
                          <IconCheck size={12} />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-[var(--fg-muted)] mt-2.5 leading-relaxed">
                      {t("onboarding.typeRestaurantDesc")}
                    </p>
                  </div>

                  <div
                    onClick={() => setBusinessType("cafe")}
                    className={`cursor-pointer rounded-xl border p-4.5 transition-all ${
                      businessType === "cafe"
                        ? "border-2 border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-xs"
                        : "border-[var(--border-default)] bg-[var(--bg-surface-elevated)] hover:border-[var(--border-hover)]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                          <IconCafe size={20} />
                        </div>
                        <span className="text-sm font-bold text-[var(--fg-default)]">
                          {t("onboarding.typeCafe")}
                        </span>
                      </div>
                      {businessType === "cafe" && (
                        <div className="h-5 w-5 rounded-full bg-[var(--color-primary)] text-[var(--color-primary-fg)] flex items-center justify-center">
                          <IconCheck size={12} />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-[var(--fg-muted)] mt-2.5 leading-relaxed">
                      {t("onboarding.typeCafeDesc")}
                    </p>
                  </div>
                </div>
              </div>

              {/* Default Language Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[var(--fg-default)]">
                  {t("onboarding.defaultLocale")} *
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {(["ar", "he", "en"] as const).map((lCode) => (
                    <button
                      key={lCode}
                      lang={lCode}
                      type="button"
                      onClick={() => setDefaultLocale(lCode)}
                      className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                        defaultLocale === lCode
                          ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-fg)] shadow-xs"
                          : "border-[var(--border-default)] bg-[var(--bg-surface-elevated)] text-[var(--fg-muted)] hover:text-[var(--fg-default)]"
                      }`}
                    >
                      {lCode === "ar" ? "العربية" : lCode === "he" ? "עברית" : "English"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Timezone & Currency */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[var(--fg-default)]">
                    {t("onboarding.timezone")}
                  </label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full h-10 rounded-xl border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 text-xs text-[var(--fg-default)] focus:outline-none focus:border-[var(--color-primary)]"
                  >
                    <option value="Asia/Jerusalem">Asia/Jerusalem (UTC+02:00/03:00)</option>
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
                    placeholder="ILS"
                  />
                </div>
              </div>
            </CardContent>
          </>
        )}

        {/* Step 3: Contact & Branding */}
        {currentStep === 3 && (
          <>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  <IconBranding size={18} />
                </div>
                <div>
                  <CardTitle className="text-lg">{t("onboarding.step3.title")}</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {t("onboarding.step3.desc")}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Contact Information */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-[var(--fg-default)] border-b border-[var(--border-subtle)] pb-2">
                  {t("onboarding.contactTitle")}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <label className="text-xs text-[var(--fg-muted)] font-medium">
                      {t("onboarding.phone")}
                    </label>
                    <Input
                      dir="ltr"
                      value={phonePublic}
                      onChange={(e) => setPhonePublic(e.target.value)}
                      placeholder={t("onboarding.phonePlaceholder")}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-[var(--fg-muted)] font-medium">
                      {t("onboarding.email")}
                    </label>
                    <Input
                      dir="ltr"
                      value={emailPublic}
                      onChange={(e) => setEmailPublic(e.target.value)}
                      placeholder={t("onboarding.emailPlaceholder")}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-[var(--fg-muted)] font-medium">
                      {t("onboarding.website")}
                    </label>
                    <Input
                      dir="ltr"
                      value={websiteUrl}
                      onChange={(e) => setWebsiteUrl(e.target.value)}
                      placeholder={t("onboarding.websitePlaceholder")}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-[var(--fg-muted)] font-medium">
                      {t("onboarding.instagram")}
                    </label>
                    <Input
                      dir="ltr"
                      value={instagramUrl}
                      onChange={(e) => setInstagramUrl(e.target.value)}
                      placeholder={t("onboarding.instagramPlaceholder")}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-[var(--fg-muted)] font-medium">
                      {t("onboarding.facebook")}
                    </label>
                    <Input
                      dir="ltr"
                      value={facebookUrl}
                      onChange={(e) => setFacebookUrl(e.target.value)}
                      placeholder={t("onboarding.facebookPlaceholder")}
                    />
                  </div>
                </div>
              </div>

              {/* Branding Colors */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-[var(--fg-default)] border-b border-[var(--border-subtle)] pb-2">
                  {t("onboarding.brandingTitle")}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs text-[var(--fg-muted)] font-medium">
                      {t("onboarding.primaryColor")}
                    </label>
                    <div className="flex items-center gap-2.5">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="h-10 w-14 rounded-lg border border-[var(--border-default)] cursor-pointer bg-transparent"
                      />
                      <Input
                        dir="ltr"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs text-[var(--fg-muted)] font-medium">
                      {t("onboarding.accentColor")}
                    </label>
                    <div className="flex items-center gap-2.5">
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="h-10 w-14 rounded-lg border border-[var(--border-default)] cursor-pointer bg-transparent"
                      />
                      <Input
                        dir="ltr"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </>
        )}

        {/* Step 4: First Branch */}
        {currentStep === 4 && (
          <>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  <IconStore size={18} />
                </div>
                <div>
                  <CardTitle className="text-lg">{t("onboarding.branchTitle")}</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {t("onboarding.branchSubtitle")}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--fg-default)]">
                    {t("onboarding.branchName")} *
                  </label>
                  <Input
                    value={branchName[userLocale]}
                    onChange={(e) => setBranchName({ ...branchName, [userLocale]: e.target.value })}
                    placeholder={t("onboarding.branchNamePlaceholder")}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--fg-default)]">
                    {t("onboarding.branchSlug")} *
                  </label>
                  <Input
                    dir="ltr"
                    value={branchSlug}
                    onChange={(e) => setBranchSlug(normalizeSlug(e.target.value))}
                    placeholder={t("onboarding.branchSlugPlaceholder")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--fg-default)]">
                    {t("onboarding.addressLine1")} *
                  </label>
                  <Input
                    value={branchAddressLine1}
                    onChange={(e) => setBranchAddressLine1(e.target.value)}
                    placeholder={t("onboarding.addressLine1Placeholder")}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-[var(--fg-muted)] font-medium">
                    {t("onboarding.addressLine2")}
                  </label>
                  <Input
                    value={branchAddressLine2}
                    onChange={(e) => setBranchAddressLine2(e.target.value)}
                    placeholder="Floor 1, Suite 4"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--fg-default)]">
                    {t("onboarding.city")} *
                  </label>
                  <Input
                    value={branchCity}
                    onChange={(e) => setBranchCity(e.target.value)}
                    placeholder={t("onboarding.cityPlaceholder")}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--fg-default)]">
                    {t("onboarding.country")}
                  </label>
                  <Input
                    dir="ltr"
                    value={branchCountry}
                    onChange={(e) => setBranchCountry(e.target.value.toUpperCase())}
                    placeholder="IL"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-[var(--fg-muted)] font-medium">
                    {t("locations.phone")}
                  </label>
                  <Input
                    dir="ltr"
                    value={branchPhone}
                    onChange={(e) => setBranchPhone(e.target.value)}
                    placeholder="+972 4 800 0001"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-[var(--fg-muted)] font-medium">
                    {t("locations.email")}
                  </label>
                  <Input
                    dir="ltr"
                    value={branchEmail}
                    onChange={(e) => setBranchEmail(e.target.value)}
                    placeholder="branch@restaurant.com"
                  />
                </div>
              </div>
            </CardContent>
          </>
        )}

        {/* Step 5: Opening Hours (Refined Visual Editor) */}
        {currentStep === 5 && (
          <>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  <IconClock size={18} />
                </div>
                <div>
                  <CardTitle className="text-lg">{t("onboarding.scheduleTitle")}</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {t("onboarding.scheduleSubtitle")}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {operatingHours.map((hour, idx) => {
                const dayKeys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
                const dayNameKey = dayKeys[hour.dayOfWeek - 1]!;
                const dayName = t(`onboarding.${dayNameKey}`);

                return (
                  <div
                    key={hour.dayOfWeek}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border transition-colors ${
                      hour.isClosed
                        ? "border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)]/60 opacity-80"
                        : "border-[var(--border-default)] bg-[var(--bg-surface-elevated)]"
                    }`}
                  >
                    <div className="w-32 font-semibold text-xs text-[var(--fg-default)] flex items-center gap-2">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          hour.isClosed ? "bg-[var(--fg-muted)]" : "bg-[var(--color-success)]"
                        }`}
                      />
                      <span>{dayName}</span>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...operatingHours];
                          updated[idx] = { ...hour, isClosed: !hour.isClosed };
                          setOperatingHours(updated);
                        }}
                        className={`px-2.5 py-1 text-xs rounded-lg font-medium border transition-colors cursor-pointer ${
                          hour.isClosed
                            ? "bg-[var(--color-destructive)]/10 border-[var(--color-destructive)]/20 text-[var(--color-destructive)] font-semibold"
                            : "bg-[var(--bg-surface)] border-[var(--border-default)] text-[var(--fg-muted)] hover:text-[var(--fg-default)]"
                        }`}
                      >
                        {hour.isClosed ? t("onboarding.closed") : t("common.active")}
                      </button>

                      {!hour.isClosed ? (
                        <div className="flex items-center gap-1.5 text-xs" dir="ltr">
                          <input
                            type="time"
                            value={hour.openTime}
                            onChange={(e) => {
                              const updated = [...operatingHours];
                              updated[idx] = { ...hour, openTime: e.target.value };
                              setOperatingHours(updated);
                            }}
                            className="h-8 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-2 text-xs text-[var(--fg-default)] focus:outline-none focus:border-[var(--color-primary)] font-mono"
                          />
                          <span className="text-[var(--fg-muted)]">–</span>
                          <input
                            type="time"
                            value={hour.closeTime}
                            onChange={(e) => {
                              const updated = [...operatingHours];
                              updated[idx] = { ...hour, closeTime: e.target.value };
                              setOperatingHours(updated);
                            }}
                            className="h-8 rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] px-2 text-xs text-[var(--fg-default)] focus:outline-none focus:border-[var(--color-primary)] font-mono"
                          />
                        </div>
                      ) : (
                        <div className="h-8 flex items-center px-3 text-xs text-[var(--fg-muted)] italic">
                          {t("onboarding.closed")}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </>
        )}

        {/* Step 6: Commercial Plan Selection */}
        {currentStep === 6 && lockedAgreement && (
          <>
            <CardHeader>
              <CardTitle>{activationLabels[locale].locked}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xl font-bold">{lockedAgreement.name}</p>
              <p>
                {activationLabels[locale][lockedAgreement.cycle]} ·{" "}
                {new Intl.NumberFormat(locale, { style: "currency", currency: "ILS" }).format(
                  lockedAgreement.amount,
                )}
              </p>
              <p dir="ltr">{lockedAgreement.reference}</p>
              <p>{activationLabels[locale].approvedBy}</p>
            </CardContent>
          </>
        )}
        {currentStep === 6 && !lockedAgreement && (
          <>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
                  <IconSparkles size={18} />
                </div>
                <div>
                  <CardTitle className="text-lg">{t("onboarding.planTitle")}</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {t("onboarding.planSubtitle")}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {availablePlans.map((plan) => {
                  const isSelected = selectedPlanId === plan.id;
                  const planName = plan.name[locale] || plan.name.en || plan.code;
                  const planDesc = plan.description
                    ? plan.description[locale] || plan.description.en
                    : "";

                  const featuresList: string[] = Array.isArray(plan.features)
                    ? plan.features
                    : (plan.features as Record<SupportedLocale, string[]>)[locale] ||
                      (plan.features as Record<SupportedLocale, string[]>).en ||
                      [];

                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`cursor-pointer rounded-xl border p-4.5 flex flex-col justify-between transition-all ${
                        isSelected
                          ? "border-2 border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-md"
                          : "border-[var(--border-default)] bg-[var(--bg-surface-elevated)] hover:border-[var(--border-hover)]"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold text-[var(--fg-default)]">
                            {planName}
                            <span className="mt-2 block text-base font-normal">
                              {plan.price_is_starting && commercialLabels[locale].from}{" "}
                              {new Intl.NumberFormat(locale, {
                                style: "currency",
                                currency: "ILS",
                              }).format(plan.monthly_price_ils)}{" "}
                              {commercialLabels[locale].month} ·{" "}
                              {new Intl.NumberFormat(locale, {
                                style: "currency",
                                currency: "ILS",
                              }).format(plan.yearly_price_ils)}{" "}
                              {commercialLabels[locale].year}
                            </span>
                          </span>
                          {isSelected && (
                            <Badge variant="primary" className="text-[10px]">
                              {t("onboarding.selected")}
                            </Badge>
                          )}
                        </div>
                        {planDesc && (
                          <p className="text-xs text-[var(--fg-muted)] mt-1.5 line-clamp-2 leading-relaxed">
                            {planDesc}
                          </p>
                        )}
                        <div className="border-t border-[var(--border-subtle)] my-3.5" />
                        <ul className="space-y-2 text-xs text-[var(--fg-default)]">
                          {featuresList.map((feat, fIdx) => (
                            <li
                              key={fIdx}
                              className="flex items-start gap-2 text-[11px] leading-tight"
                            >
                              <IconCheck
                                size={13}
                                className="text-[var(--color-primary)] shrink-0 mt-0.5"
                              />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-5 pt-2">
                        <Button
                          size="sm"
                          variant={isSelected ? "primary" : "outline"}
                          className="w-full"
                          type="button"
                        >
                          {isSelected ? t("onboarding.selected") : t("onboarding.selectPlan")}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-3 text-xs text-[var(--fg-muted)] leading-relaxed">
                {t("onboarding.noBillingNotice")}
              </div>
            </CardContent>
          </>
        )}

        {/* Step 7: Review & Launch */}
        {currentStep === 7 && (
          <>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-success)]/10 text-[var(--color-success)]">
                  <IconCheck size={18} />
                </div>
                <div>
                  <CardTitle className="text-lg">{t("onboarding.reviewTitle")}</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {t("onboarding.reviewSubtitle")}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {creationError && (
                <div className="rounded-xl border border-[var(--color-destructive)]/40 bg-[var(--color-destructive-bg)] p-3 text-xs text-[var(--color-destructive)] flex items-center gap-2">
                  <IconWarning size={14} />
                  <span>{creationError}</span>
                </div>
              )}

              {creationSuccess && (
                <div className="rounded-xl border border-[var(--color-success)]/40 bg-[var(--color-success-bg)] p-4 text-xs text-[var(--color-success)] flex items-center gap-2.5">
                  <IconCheck size={16} />
                  <span className="font-semibold text-sm">{t("onboarding.creationSuccess")}</span>
                </div>
              )}

              {/* Review Sections Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Identity Summary */}
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--fg-default)]">
                      {t("onboarding.step1.title")}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="text-[11px] font-medium text-[var(--color-primary)] hover:underline cursor-pointer"
                    >
                      {t("common.edit")}
                    </button>
                  </div>
                  <div className="text-xs space-y-1 text-[var(--fg-muted)]">
                    <div>
                      <strong className="text-[var(--fg-default)]">
                        {businessName[userLocale] || Object.values(businessName).find(Boolean)}
                      </strong>
                    </div>
                    <div dir="ltr" className="text-start">
                      rest.darb.co.il/{businessSlug}
                    </div>
                    <div className="capitalize">
                      {businessType === "restaurant"
                        ? t("onboarding.typeRestaurant")
                        : t("onboarding.typeCafe")}
                    </div>
                  </div>
                </div>

                {/* Branch Summary */}
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--fg-default)]">
                      {t("onboarding.branchTitle")}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(4)}
                      className="text-[11px] font-medium text-[var(--color-primary)] hover:underline cursor-pointer"
                    >
                      {t("common.edit")}
                    </button>
                  </div>
                  <div className="text-xs space-y-1 text-[var(--fg-muted)]">
                    <div>
                      <strong className="text-[var(--fg-default)]">
                        {branchName[userLocale] || businessName[userLocale] || "Main Branch"}
                      </strong>
                    </div>
                    <div>
                      {branchAddressLine1}, {branchCity}
                    </div>
                    <div>{branchCountry}</div>
                  </div>
                </div>

                {/* Hours Summary */}
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--fg-default)]">
                      {t("onboarding.scheduleTitle")}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(5)}
                      className="text-[11px] font-medium text-[var(--color-primary)] hover:underline cursor-pointer"
                    >
                      {t("common.edit")}
                    </button>
                  </div>
                  <div className="text-xs space-y-1 text-[var(--fg-muted)]">
                    <div>{operatingHours.filter((h) => !h.isClosed).length} / 7 active</div>
                    <div className="text-[11px]" dir="ltr">
                      {operatingHours[0]?.openTime} – {operatingHours[0]?.closeTime}
                    </div>
                  </div>
                </div>

                {/* Plan Summary */}
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-elevated)] p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--fg-default)]">
                      {t("onboarding.planTitle")}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(6)}
                      className="text-[11px] font-medium text-[var(--color-primary)] hover:underline cursor-pointer"
                    >
                      {t("common.edit")}
                    </button>
                  </div>
                  <div className="text-xs space-y-1 text-[var(--fg-muted)]">
                    <div>
                      <strong className="text-[var(--fg-default)]">
                        {availablePlans.find((p) => p.id === selectedPlanId)?.name[locale] ||
                          "Pro Plan"}
                      </strong>
                    </div>
                    <div className="text-[11px] text-[var(--color-success)] font-medium">
                      Active Tier
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </>
        )}

        {/* Card Footer Navigation Actions */}
        <CardFooter className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-4 px-4 sm:px-6">
          <div>
            {currentStep > 1 && (
              <Button
                variant="outline"
                size="md"
                onClick={handleStepBack}
                disabled={isPending || creationSuccess}
                startIcon={<ArrowStart direction={direction} size={15} />}
              >
                {t("common.back")}
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {stepError && (
              <span className="text-xs text-[var(--color-destructive)] font-medium">
                {stepError}
              </span>
            )}

            {currentStep < 7 ? (
              <Button
                variant="primary"
                size="md"
                onClick={validateAndAdvance}
                endIcon={<ArrowEnd direction={direction} size={15} />}
              >
                {t("common.next")}
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={handleCompleteOnboarding}
                isLoading={isPending}
                disabled={creationSuccess}
                startIcon={<IconCheck size={16} />}
              >
                {isPending
                  ? t("onboarding.creatingBusiness")
                  : t("onboarding.createBusinessButton")}
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
