import { describe, it, expect } from "vitest";
import {
  normalizeSlug,
  isSlugAllowed,
  RESERVED_SLUGS,
  step1IdentitySchema,
  operatingHourItemSchema,
  completeOnboardingSchema,
  onboardingDraftCookieSchema,
} from "../index";

describe("Phase 3 Onboarding & Operating Hours Validation", () => {
  describe("Slug validation & normalization", () => {
    it("normalizes business titles to clean lowercase kebab slugs", () => {
      expect(normalizeSlug("Darb Artisan Café!")).toBe("darb-artisan-caf");
      expect(normalizeSlug("  Super   Bistro 2026_special  ")).toBe("super-bistro-2026-special");
      expect(normalizeSlug("---leading-and-trailing---")).toBe("leading-and-trailing");
    });

    it("identifies reserved slugs correctly", () => {
      for (const reserved of RESERVED_SLUGS) {
        expect(isSlugAllowed(reserved)).toBe(false);
      }
    });

    it("allows valid non-reserved slugs", () => {
      expect(isSlugAllowed("my-restaurant")).toBe(true);
      expect(isSlugAllowed("haifa-burger-bar")).toBe(true);
      expect(isSlugAllowed("cappuccino-house")).toBe(true);
    });

    it("rejects slugs that are too short, have invalid characters, or are reserved", () => {
      expect(isSlugAllowed("ab")).toBe(false); // too short
      expect(isSlugAllowed("admin")).toBe(false); // reserved
      expect(isSlugAllowed("settings")).toBe(false); // reserved
      expect(isSlugAllowed("darb")).toBe(false); // reserved
    });
  });

  describe("Step 1 Identity Schema", () => {
    it("accepts valid identity data with at least one language", () => {
      const valid = {
        name: { ar: "درب بيسترو", en: "Darb Bistro" },
        slug: "darb-bistro",
      };
      const result = step1IdentitySchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects empty names in all languages", () => {
      const invalid = {
        name: { ar: "", he: "", en: "" },
        slug: "darb-bistro",
      };
      const result = step1IdentitySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects reserved slug in step 1", () => {
      const invalid = {
        name: { en: "Admin Restaurant" },
        slug: "admin",
      };
      const result = step1IdentitySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("Operating Hours Schema", () => {
    it("validates standard opening hours interval", () => {
      const valid = {
        dayOfWeek: 1,
        openTime: "08:30",
        closeTime: "22:00",
        isClosed: false,
      };
      const result = operatingHourItemSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("validates closed day", () => {
      const closed = {
        dayOfWeek: 7,
        openTime: "00:00",
        closeTime: "00:00",
        isClosed: true,
      };
      const result = operatingHourItemSchema.safeParse(closed);
      expect(result.success).toBe(true);
    });

    it("rejects invalid day of week outside 1-7", () => {
      const invalid = {
        dayOfWeek: 0,
        openTime: "08:00",
        closeTime: "20:00",
        isClosed: false,
      };
      const result = operatingHourItemSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("Complete Onboarding Composite Schema", () => {
    it("validates complete onboarding payload", () => {
      const payload = {
        businessName: { ar: "درب كافيه", he: "דרב קפה", en: "Darb Cafe" },
        businessSlug: "darb-cafe",
        businessType: "cafe" as const,
        defaultLocale: "ar" as const,
        timezone: "Asia/Jerusalem",
        currency: "ILS",
        phonePublic: "+972501234567",
        emailPublic: "hello@darbcafe.com",
        websiteUrl: "https://darbcafe.com",
        primaryColor: "#0284c7",
        accentColor: "#d97706",
        branchName: { ar: "الفرع الرئيسي", he: "סניף ראשי", en: "Main Branch" },
        branchSlug: "main-branch",
        branchPhone: "+972501234567",
        branchAddressLine1: "Haatzmaut 10",
        branchCity: "Haifa",
        branchCountry: "IL",
        operatingHours: [
          { dayOfWeek: 1, openTime: "08:00", closeTime: "22:00", isClosed: false },
          { dayOfWeek: 2, openTime: "08:00", closeTime: "22:00", isClosed: false },
          { dayOfWeek: 3, openTime: "08:00", closeTime: "22:00", isClosed: false },
          { dayOfWeek: 4, openTime: "08:00", closeTime: "22:00", isClosed: false },
          { dayOfWeek: 5, openTime: "08:00", closeTime: "23:00", isClosed: false },
          { dayOfWeek: 6, openTime: "09:00", closeTime: "23:00", isClosed: false },
          { dayOfWeek: 7, openTime: "10:00", closeTime: "21:00", isClosed: true },
        ],
        planId: "22222222-2222-2222-2222-222222222222",
      };

      const result = completeOnboardingSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });

  describe("Onboarding Draft Cookie Schema (Minimal State)", () => {
    it("accepts valid minimal draft cookie state", () => {
      const valid = {
        draftId: "d1111111-1111-1111-1111-111111111111",
        currentStep: 3,
      };
      const result = onboardingDraftCookieSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects draft cookie missing draftId or with invalid step", () => {
      expect(onboardingDraftCookieSchema.safeParse({ draftId: "", currentStep: 1 }).success).toBe(
        false,
      );
      expect(
        onboardingDraftCookieSchema.safeParse({ draftId: "valid-id", currentStep: 0 }).success,
      ).toBe(false);
      expect(
        onboardingDraftCookieSchema.safeParse({ draftId: "valid-id", currentStep: 8 }).success,
      ).toBe(false);
    });
  });
});
