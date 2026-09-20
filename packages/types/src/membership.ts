import type { TenantRole } from "./roles";

export type MembershipStatus = "active" | "invited" | "suspended";

export interface Membership {
  id: string;
  userId: string;
  businessId: string;
  role: TenantRole;
  status: MembershipStatus;
  createdAt: string;
  updatedAt: string;
}

export interface UserBusinessMembership extends Membership {
  businessName: string;
  businessSlug: string;
  businessType: "restaurant" | "cafe";
}
