import {
  FEATURE_FLAGS,
  V1_FEATURE_FLAGS,
  type FeatureFlag,
  type PlanEntitlement,
  type BusinessFeatureOverride,
  type ResolvedEntitlements,
} from "@darb-rest/types";

/**
 * Creates default fallback entitlements for all known feature flags
 */
export function createDefaultEntitlements(): ResolvedEntitlements {
  const result = {} as ResolvedEntitlements;
  for (const feature of FEATURE_FLAGS) {
    result[feature] = {
      enabled: false,
      limitValue: null,
      source: "default",
    };
  }
  return result;
}

/**
 * Resolves commercial plan entitlements and active business overrides with strict precedence:
 * Precedence Order:
 * 1. Business Override (if active and not expired)
 * 2. Plan Entitlement
 * 3. Default fallback (disabled)
 */
export function resolveEntitlements(
  planEntitlements: PlanEntitlement[] = [],
  overrides: BusinessFeatureOverride[] = [],
  now: Date = new Date(),
): ResolvedEntitlements {
  const resolved = createDefaultEntitlements();

  // 1. Apply plan entitlements
  for (const entitlement of planEntitlements) {
    if (FEATURE_FLAGS.includes(entitlement.featureKey)) {
      resolved[entitlement.featureKey] = {
        enabled: entitlement.enabled,
        limitValue: entitlement.limitValue ?? null,
        source: "plan",
      };
    }
  }

  // 2. Apply active business feature overrides (highest precedence)
  for (const override of overrides) {
    if (!FEATURE_FLAGS.includes(override.featureKey)) continue;

    // Check expiration if set
    if (override.expiresAt) {
      const expirationDate = new Date(override.expiresAt);
      if (expirationDate <= now) {
        continue; // Expired override is skipped
      }
    }

    resolved[override.featureKey] = {
      enabled: override.enabled,
      limitValue: override.limitValue ?? null,
      source: "override",
    };
  }

  for (const key of FEATURE_FLAGS)
    if (!(V1_FEATURE_FLAGS as readonly string[]).includes(key))
      resolved[key] = { enabled: false, limitValue: null, source: "default" };
  return resolved;
}

/**
 * Query whether a feature is permitted under the resolved entitlements
 */
export function canUseFeature(
  entitlements: ResolvedEntitlements,
  featureKey: FeatureFlag,
): boolean {
  return Boolean(entitlements[featureKey]?.enabled);
}

/**
 * Query the numeric quota or limit value for a feature (e.g. maxLocations)
 * Returns null if unlimited or not applicable
 */
export function getFeatureLimit(
  entitlements: ResolvedEntitlements,
  featureKey: FeatureFlag,
): number | null {
  const entitlement = entitlements[featureKey];
  if (!entitlement || !entitlement.enabled) {
    return 0;
  }
  return entitlement.limitValue ?? null;
}
