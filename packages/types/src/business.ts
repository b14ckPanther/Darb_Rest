import type { SupportedLocale } from "@darb-rest/config";

export type BusinessType = "restaurant" | "cafe";
export type BusinessStatus = "pending" | "active" | "suspended" | "archived";

export interface BusinessSettings {
  businessId: string;
  primaryColor?: string;
  accentColor?: string;
  logoUrl?: string;
  coverUrl?: string;
  coverVideoUrl?: string;
  phonePublic?: string;
  emailPublic?: string;
  websiteUrl?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  cancellationPolicy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Business {
  id: string;
  slug: string;
  name: Record<SupportedLocale, string>;
  legalName?: string;
  businessType: BusinessType;
  status: BusinessStatus;
  defaultLocale: SupportedLocale;
  timezone: string;
  currency: string;
  planId?: string;
  disabledAt?: string;
  onboardingStep?: number;
  createdAt: string;
  updatedAt: string;
}

export type LocationStatus = "active" | "inactive" | "temporarily_closed";

/**
 * ISO Convention: 1 = Monday, 2 = Tuesday, ..., 7 = Sunday
 */
export type DayOfWeek = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface OperatingHour {
  id: string;
  locationId: string;
  dayOfWeek: DayOfWeek;
  openTime: string; // HH:mm format, e.g. "08:00"
  closeTime: string; // HH:mm format, e.g. "22:00"
  isClosed: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface OperatingHoursInput {
  dayOfWeek: DayOfWeek;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

export interface BranchLocation {
  id: string;
  businessId: string;
  slug: string;
  name: Record<SupportedLocale, string>;
  phone?: string;
  email?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  stateRegion?: string;
  postalCode?: string;
  country: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  isPrimary: boolean;
  status: LocationStatus;
  operatingHours?: OperatingHour[];
  createdAt: string;
  updatedAt: string;
}

export interface OnboardingDraft {
  step: number;
  businessName: { ar: string; he: string; en: string };
  legalName?: string;
  businessSlug: string;
  businessType: BusinessType;
  defaultLocale: SupportedLocale;
  timezone: string;
  currency: string;
  phonePublic?: string;
  emailPublic?: string;
  websiteUrl?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  primaryColor?: string;
  accentColor?: string;
  branchName: { ar: string; he: string; en: string };
  branchSlug: string;
  branchPhone?: string;
  branchEmail?: string;
  branchAddressLine1: string;
  branchAddressLine2?: string;
  branchCity: string;
  branchCountry: string;
  branchLatitude?: number;
  branchLongitude?: number;
  operatingHours: OperatingHoursInput[];
  planId?: string;
}

/**
 * Minimal state stored in the client cookie.
 * Does NOT contain sensitive or meaningful business data.
 */
export interface OnboardingDraftCookie {
  draftId: string;
  currentStep: number;
}

/**
 * Server-side stored onboarding draft record.
 */
export interface OnboardingDraftRecord {
  id: string;
  userId: string;
  currentStep: number;
  data: Partial<OnboardingDraft>;
  createdAt: string;
  updatedAt: string;
}
