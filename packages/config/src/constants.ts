export const PRODUCT_NAME = "Darb REST" as const;
export const PRODUCT_DESCRIPTION = "Independent Multi-Tenant Restaurant & Café Engine" as const;
export const PRODUCTION_DOMAIN = "rest.darb.co.il" as const;

export const SUPPORTED_LOCALES = ["ar", "he", "en"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = "ar";

export const RTL_LOCALES: readonly SupportedLocale[] = ["ar", "he"] as const;
export const LTR_LOCALES: readonly SupportedLocale[] = ["en"] as const;

export const BUSINESS_TYPES = ["restaurant", "cafe"] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const COOKIE_KEYS = {
  LOCALE: "darb_rest_locale",
  TENANT: "darb_rest_tenant",
  ACTIVE_BUSINESS: "darb_rest_active_business",
  ACTIVE_LOCATION: "darb_rest_active_location",
  ONBOARDING_DRAFT: "darb_rest_onboarding_draft",
} as const;

export const APP_PORTS = {
  WEB: 3000,
  ADMIN: 3001,
} as const;
