/**
 * Commercial Plans, Feature Entitlements & Overrides
 */
export const PLAN_TIERS = ["starter", "pro", "enterprise"] as const;
export type PlanTier = (typeof PLAN_TIERS)[number];

export const FEATURE_FLAGS = [
  "digital_menu",
  "qr_codes",
  "online_ordering",
  "table_ordering",
  "takeaway",
  "online_payments",
  "advanced_analytics",
  "custom_domains",
  "custom_branding",
  "multi_location",
  "inventory_tracking",
] as const;

export type FeatureFlag = (typeof FEATURE_FLAGS)[number];

export interface CommercialPlan {
  id: string;
  code: string;
  name: Record<string, string>;
  description?: Record<string, string>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlanEntitlement {
  id: string;
  planId: string;
  featureKey: FeatureFlag;
  enabled: boolean;
  limitValue?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessFeatureOverride {
  id: string;
  businessId: string;
  featureKey: FeatureFlag;
  enabled: boolean;
  limitValue?: number | null;
  reason?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ResolvedEntitlement {
  enabled: boolean;
  limitValue?: number | null;
  source: "override" | "plan" | "default";
}

export type ResolvedEntitlements = Record<FeatureFlag, ResolvedEntitlement>;
