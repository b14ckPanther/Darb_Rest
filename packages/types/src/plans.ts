/**
 * Commercial Plans, Feature Entitlements & Overrides
 */
export const PLAN_TIERS = ["starter", "pro", "business"] as const;
export type PlanTier = (typeof PLAN_TIERS)[number];

export const V1_FEATURE_FLAGS = [
  "digital_menu",
  "qr_codes",
  "custom_branding",
  "menu_templates",
  "cart",
  "whatsapp_ordering",
  "reservation_requests",
  "multi_location",
] as const;

export const FEATURE_FLAGS = [
  "menu_templates",
  "cart",
  "whatsapp_ordering",
  "reservation_requests",
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

/** Safe public projection of migration 16's single commercial catalog. */
export interface PublicCommercialPlan {
  id: string;
  code: PlanTier;
  name: Record<string, string>;
  description: Record<string, string> | null;
  monthly_price_ils: number;
  yearly_price_ils: number;
  price_is_starting: boolean;
  display_order: number;
  public_features: Record<string, string[]>;
  billing_note: Record<string, string>;
  entitlements: { feature_key: string; enabled: boolean; limit_value: number | null }[];
}
