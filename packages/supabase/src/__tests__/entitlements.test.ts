import { describe, it, expect } from "vitest";
import {
  resolveEntitlements,
  canUseFeature,
  getFeatureLimit,
  createDefaultEntitlements,
} from "../entitlements";
import type { PlanEntitlement, BusinessFeatureOverride } from "@darb-rest/types";

describe("Entitlement Resolution Engine", () => {
  it("initializes default entitlements as disabled", () => {
    const defaults = createDefaultEntitlements();
    expect(canUseFeature(defaults, "online_ordering")).toBe(false);
    expect(canUseFeature(defaults, "digital_menu")).toBe(false);
    expect(defaults.digital_menu.source).toBe("default");
  });

  it("applies plan entitlements correctly", () => {
    const planEntitlements: PlanEntitlement[] = [
      {
        id: "pe-1",
        planId: "plan-pro",
        featureKey: "digital_menu",
        enabled: true,
        limitValue: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "pe-2",
        planId: "plan-pro",
        featureKey: "multi_location",
        enabled: true,
        limitValue: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const resolved = resolveEntitlements(planEntitlements);

    expect(canUseFeature(resolved, "digital_menu")).toBe(true);
    expect(resolved.digital_menu.source).toBe("plan");
    expect(canUseFeature(resolved, "multi_location")).toBe(true);
    expect(getFeatureLimit(resolved, "multi_location")).toBe(3);
    expect(canUseFeature(resolved, "custom_domains")).toBe(false);
  });

  it("prioritizes active business overrides over plan entitlements", () => {
    const planEntitlements: PlanEntitlement[] = [
      {
        id: "pe-1",
        planId: "plan-starter",
        featureKey: "online_ordering",
        enabled: false,
        limitValue: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "pe-2",
        planId: "plan-starter",
        featureKey: "multi_location",
        enabled: false,
        limitValue: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const overrides: BusinessFeatureOverride[] = [
      {
        id: "bfo-1",
        businessId: "biz-1",
        featureKey: "online_ordering",
        enabled: true, // Special enterprise agreement granted early
        limitValue: null,
        reason: "Trial agreement",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "bfo-2",
        businessId: "biz-1",
        featureKey: "multi_location",
        enabled: true,
        limitValue: 5,
        reason: "VIP account",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const resolved = resolveEntitlements(planEntitlements, overrides);

    expect(canUseFeature(resolved, "online_ordering")).toBe(true);
    expect(resolved.online_ordering.source).toBe("override");
    expect(canUseFeature(resolved, "multi_location")).toBe(true);
    expect(getFeatureLimit(resolved, "multi_location")).toBe(5);
  });

  it("ignores expired business overrides", () => {
    const planEntitlements: PlanEntitlement[] = [
      {
        id: "pe-1",
        planId: "plan-starter",
        featureKey: "advanced_analytics",
        enabled: false,
        limitValue: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const expiredDate = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(); // 1 day ago
    const overrides: BusinessFeatureOverride[] = [
      {
        id: "bfo-expired",
        businessId: "biz-1",
        featureKey: "advanced_analytics",
        enabled: true,
        limitValue: null,
        expiresAt: expiredDate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const resolved = resolveEntitlements(planEntitlements, overrides);

    expect(canUseFeature(resolved, "advanced_analytics")).toBe(false);
    expect(resolved.advanced_analytics.source).toBe("plan");
  });
});
