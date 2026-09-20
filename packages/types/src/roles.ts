/**
 * Tenant Role Hierarchy and Permissions
 * Separate from platform super administration.
 */
export const TENANT_ROLES = ["owner", "admin", "manager", "editor", "staff", "read_only"] as const;

export type TenantRole = (typeof TENANT_ROLES)[number];

export const ROLE_HIERARCHY: Record<TenantRole, number> = {
  owner: 6,
  admin: 5,
  manager: 4,
  editor: 3,
  staff: 2,
  read_only: 1,
};

export interface PlatformAdmin {
  id: string;
  userId: string;
  createdAt: string;
  createdBy?: string;
}

export function hasRole(userRole: TenantRole, minimumRole: TenantRole): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minimumRole];
}

export function hasAnyRole(userRole: TenantRole, allowedRoles: TenantRole[]): boolean {
  return allowedRoles.includes(userRole);
}

export function canManageBusiness(role: TenantRole): boolean {
  return hasAnyRole(role, ["owner", "admin"]);
}

export function canManageBranches(role: TenantRole): boolean {
  return hasAnyRole(role, ["owner", "admin", "manager"]);
}

export function canManageStaff(role: TenantRole): boolean {
  return hasAnyRole(role, ["owner", "admin"]);
}

export function canManageMenu(role: TenantRole): boolean {
  return hasAnyRole(role, ["owner", "admin", "manager", "editor"]);
}

export function canViewOrders(_role: TenantRole): boolean {
  return true; // All active roles can view orders
}

export function canManageOrders(role: TenantRole): boolean {
  return hasAnyRole(role, ["owner", "admin", "manager", "staff"]);
}

export function canManageBranding(role: TenantRole): boolean {
  return hasAnyRole(role, ["owner", "admin"]);
}

export function canManageBilling(role: TenantRole): boolean {
  return role === "owner";
}
