import type { Business, BranchLocation } from "./business";
import type { Membership } from "./membership";
import type { UserProfile } from "./user";
import type { TenantRole } from "./roles";
import type { ResolvedEntitlements } from "./plans";

export interface AccessibleBusiness {
  id: string;
  slug: string;
  name: string;
  businessType: "restaurant" | "cafe";
  role: TenantRole;
}

export interface TenantContext {
  user: UserProfile;
  activeBusiness: Business | null;
  activeMembership: Membership | null;
  activeLocation: BranchLocation | null;
  availableLocations: BranchLocation[];
  accessibleBusinesses: AccessibleBusiness[];
  entitlements: ResolvedEntitlements;
}
