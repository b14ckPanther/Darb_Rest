import { z } from "zod";
import { hexColorSchema } from "./theme";

export const businessTypeSchema = z.enum(["restaurant", "cafe"]);
export const businessStatusSchema = z.enum(["pending", "active", "suspended", "archived"]);

export const RESERVED_SLUGS = [
  "admin",
  "api",
  "auth",
  "dashboard",
  "login",
  "signup",
  "get-started",
  "pricing",
  "support",
  "help",
  "settings",
  "system",
  "app",
  "darb",
  "rest",
  "status",
  "terms",
  "privacy",
  "about",
  "contact",
  "billing",
  "account",
  "dev",
  "test",
  "staging",
] as const;

export function normalizeSlug(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function isSlugAllowed(slug: string): boolean {
  const normalized = normalizeSlug(slug);
  if (normalized.length < 3 || normalized.length > 50) return false;
  if (/^-|-$/.test(normalized)) return false;
  if (!/^[a-z0-9-]+$/.test(normalized)) return false;
  return !RESERVED_SLUGS.includes(normalized as (typeof RESERVED_SLUGS)[number]);
}

export const businessSlugSchema = z
  .string()
  .min(3, "Slug must be at least 3 characters")
  .max(50, "Slug must not exceed 50 characters")
  .regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase alphanumeric characters and hyphens")
  .refine(
    (val) => !RESERVED_SLUGS.includes(val.toLowerCase() as (typeof RESERVED_SLUGS)[number]),
    "This slug is reserved by the platform",
  );

export const multilingualNameSchema = z
  .object({
    ar: z.string().optional(),
    he: z.string().optional(),
    en: z.string().optional(),
  })
  .refine(
    (val) => Boolean(val.ar?.trim() || val.he?.trim() || val.en?.trim()),
    "At least one language name is required",
  );

export const businessSettingsUpdateSchema = z.object({
  primaryColor: hexColorSchema.nullable().optional(),
  accentColor: hexColorSchema.nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
  coverUrl: z.string().url().nullable().optional(),
  coverVideoUrl: z.string().url().nullable().optional(),
  phonePublic: z.string().nullable().optional(),
  emailPublic: z.string().email().nullable().optional().or(z.literal("")),
  websiteUrl: z.string().url().nullable().optional().or(z.literal("")),
  instagramUrl: z.string().nullable().optional(),
  facebookUrl: z.string().nullable().optional(),
  cancellationPolicy: z.string().nullable().optional(),
});

export const businessCreateSchema = z.object({
  slug: businessSlugSchema,
  name: z.object({
    ar: z.string().min(1),
    he: z.string().min(1),
    en: z.string().min(1),
  }),
  legalName: z.string().optional(),
  type: businessTypeSchema.default("restaurant"),
  defaultLocale: z.enum(["ar", "he", "en"]).default("ar"),
  timezone: z.string().default("Asia/Jerusalem"),
  currency: z.string().default("ILS"),
  planId: z.string().uuid().optional(),
});

export const businessUpdateSchema = businessCreateSchema.partial().omit({ slug: true });

// Multi-Step Onboarding Schemas
export const step1IdentitySchema = z.object({
  name: multilingualNameSchema,
  legalName: z.string().optional(),
  slug: businessSlugSchema,
});

export const step2TypeLocaleSchema = z.object({
  businessType: businessTypeSchema.default("restaurant"),
  defaultLocale: z.enum(["ar", "he", "en"]).default("ar"),
  timezone: z.string().min(1).default("Asia/Jerusalem"),
  currency: z.string().min(3).max(3).default("ILS"),
});

export const step3ContactBrandingSchema = z.object({
  phonePublic: z.string().optional(),
  emailPublic: z.string().email().optional().or(z.literal("")),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  instagramUrl: z.string().optional(),
  facebookUrl: z.string().optional(),
  primaryColor: hexColorSchema.optional(),
  accentColor: hexColorSchema.optional(),
});

export const operatingHourItemSchema = z.object({
  dayOfWeek: z.number().int().min(1).max(7) as unknown as z.ZodType<1 | 2 | 3 | 4 | 5 | 6 | 7>,
  openTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format must be HH:mm"),
  closeTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Format must be HH:mm"),
  isClosed: z.boolean().default(false),
});

export const step4FirstBranchSchema = z.object({
  branchName: multilingualNameSchema,
  branchSlug: z
    .string()
    .min(2, "Branch slug must be at least 2 characters")
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase alphanumeric characters and hyphens"),
  branchPhone: z.string().optional(),
  branchEmail: z.string().email().optional().or(z.literal("")),
  branchAddressLine1: z.string().min(2, "Address line is required"),
  branchAddressLine2: z.string().optional(),
  branchCity: z.string().min(2, "City is required"),
  branchCountry: z.string().min(2).max(2).default("IL"),
  branchLatitude: z.number().min(-90).max(90).optional(),
  branchLongitude: z.number().min(-180).max(180).optional(),
});

export const step5OperatingHoursSchema = z.object({
  operatingHours: z.array(operatingHourItemSchema).min(1),
});

export const step6PlanSelectionSchema = z.object({
  planId: z.string().uuid().optional(),
});

export const completeOnboardingSchema = z.object({
  // Identity
  businessName: z.object({
    ar: z.string(),
    he: z.string(),
    en: z.string(),
  }),
  legalName: z.string().optional(),
  businessSlug: businessSlugSchema,
  // Type & Locale
  businessType: businessTypeSchema,
  defaultLocale: z.enum(["ar", "he", "en"]),
  timezone: z.string().min(1),
  currency: z.string().min(3).max(3),
  // Contact & Branding
  phonePublic: z.string().optional(),
  emailPublic: z.string().email().optional().or(z.literal("")),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  instagramUrl: z.string().optional(),
  facebookUrl: z.string().optional(),
  primaryColor: hexColorSchema.optional(),
  accentColor: hexColorSchema.optional(),
  // Branch
  branchName: z.object({
    ar: z.string(),
    he: z.string(),
    en: z.string(),
  }),
  branchSlug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/),
  branchPhone: z.string().optional(),
  branchEmail: z.string().email().optional().or(z.literal("")),
  branchAddressLine1: z.string().min(2),
  branchAddressLine2: z.string().optional(),
  branchCity: z.string().min(2),
  branchCountry: z.string().min(2).max(2).default("IL"),
  branchLatitude: z.number().optional(),
  branchLongitude: z.number().optional(),
  // Operating Hours
  operatingHours: z.array(operatingHourItemSchema),
  // Plan
  planId: z.string().uuid().optional(),
});

export type BusinessCreateInput = z.infer<typeof businessCreateSchema>;
export type BusinessUpdateInput = z.infer<typeof businessUpdateSchema>;
export type BusinessSettingsUpdateInput = z.infer<typeof businessSettingsUpdateSchema>;
export type Step1IdentityInput = z.infer<typeof step1IdentitySchema>;
export type Step2TypeLocaleInput = z.infer<typeof step2TypeLocaleSchema>;
export type Step3ContactBrandingInput = z.infer<typeof step3ContactBrandingSchema>;
export type Step4FirstBranchInput = z.infer<typeof step4FirstBranchSchema>;
export type Step5OperatingHoursInput = z.infer<typeof step5OperatingHoursSchema>;
export type Step6PlanSelectionInput = z.infer<typeof step6PlanSelectionSchema>;
export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>;

/**
 * Minimal state stored in the onboarding draft cookie.
 * Contains only non-sensitive identifiers and progress step.
 */
export const onboardingDraftCookieSchema = z.object({
  draftId: z.string().min(1, "Draft ID is required"),
  currentStep: z.number().int().min(1).max(7),
});

export type OnboardingDraftCookieInput = z.infer<typeof onboardingDraftCookieSchema>;
