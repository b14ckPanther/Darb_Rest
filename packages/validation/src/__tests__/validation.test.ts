import { describe, it, expect } from "vitest";
import {
  businessCreateSchema,
  businessSettingsUpdateSchema,
  branchLocationCreateSchema,
  tenantRoleSchema,
} from "../index";

describe("Phase 2 Validation Schemas", () => {
  it("validates valid business creation input", () => {
    const validData = {
      slug: "darb-bistro",
      name: {
        ar: "درب بيسترو",
        he: "דרב ביסטרו",
        en: "Darb Bistro",
      },
      type: "restaurant" as const,
      defaultLocale: "ar" as const,
      timezone: "Asia/Jerusalem",
      currency: "ILS",
    };

    const result = businessCreateSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("rejects invalid business slug containing spaces or capital letters", () => {
    const invalidData = {
      slug: "Invalid Slug!",
      name: { ar: "درب", he: "דרב", en: "Darb" },
      type: "restaurant",
    };

    const result = businessCreateSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it("validates branch location creation schema with address line 1 and city", () => {
    const validBranch = {
      businessId: "11111111-1111-1111-1111-111111111111",
      slug: "haifa-port",
      name: {
        ar: "فرع الميناء",
        he: "סניף הנמל",
        en: "Port Branch",
      },
      addressLine1: "Port Road 14",
      city: "Haifa",
      country: "IL",
      isPrimary: true,
      status: "active" as const,
    };

    const result = branchLocationCreateSchema.safeParse(validBranch);
    expect(result.success).toBe(true);
  });

  it("validates business settings colors and links", () => {
    const validSettings = {
      primaryColor: "#d97706",
      accentColor: "#0284c7",
      websiteUrl: "https://rest.darb.co.il",
      phonePublic: "+97241234567",
    };

    const result = businessSettingsUpdateSchema.safeParse(validSettings);
    expect(result.success).toBe(true);
  });

  it("validates all 6 tenant roles", () => {
    expect(tenantRoleSchema.safeParse("owner").success).toBe(true);
    expect(tenantRoleSchema.safeParse("admin").success).toBe(true);
    expect(tenantRoleSchema.safeParse("manager").success).toBe(true);
    expect(tenantRoleSchema.safeParse("editor").success).toBe(true);
    expect(tenantRoleSchema.safeParse("staff").success).toBe(true);
    expect(tenantRoleSchema.safeParse("read_only").success).toBe(true);
    expect(tenantRoleSchema.safeParse("super_admin").success).toBe(false); // platform admin is not a tenant role
  });
});
