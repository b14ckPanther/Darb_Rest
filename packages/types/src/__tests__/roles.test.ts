import { describe, it, expect } from "vitest";
import {
  hasRole,
  hasAnyRole,
  canManageBusiness,
  canManageBranches,
  canManageStaff,
  canManageMenu,
  canManageOrders,
  canManageBranding,
  canManageBilling,
  type TenantRole,
} from "../roles";

describe("RBAC Role Hierarchy and Capability Helpers", () => {
  it("strictly enforces role hierarchy: owner > admin > manager > editor > staff > read_only", () => {
    expect(hasRole("owner", "admin")).toBe(true);
    expect(hasRole("admin", "owner")).toBe(false);
    expect(hasRole("manager", "editor")).toBe(true);
    expect(hasRole("editor", "manager")).toBe(false);
    expect(hasRole("staff", "read_only")).toBe(true);
    expect(hasRole("read_only", "staff")).toBe(false);
    expect(hasRole("manager", "manager")).toBe(true);
  });

  it("checks hasAnyRole accurately", () => {
    const managersOrAdmins: TenantRole[] = ["admin", "manager"];
    expect(hasAnyRole("manager", managersOrAdmins)).toBe(true);
    expect(hasAnyRole("admin", managersOrAdmins)).toBe(true);
    expect(hasAnyRole("staff", managersOrAdmins)).toBe(false);
  });

  it("restricts critical capabilities according to role specifications", () => {
    // Only owner can manage billing
    expect(canManageBilling("owner")).toBe(true);
    expect(canManageBilling("admin")).toBe(false);
    expect(canManageBilling("manager")).toBe(false);

    // Owner and Admin can manage business, staff, and branding
    expect(canManageBusiness("owner")).toBe(true);
    expect(canManageBusiness("admin")).toBe(true);
    expect(canManageBusiness("manager")).toBe(false);

    expect(canManageStaff("owner")).toBe(true);
    expect(canManageStaff("admin")).toBe(true);
    expect(canManageStaff("manager")).toBe(false);

    expect(canManageBranding("owner")).toBe(true);
    expect(canManageBranding("admin")).toBe(true);
    expect(canManageBranding("manager")).toBe(false);

    // Manager can manage branches
    expect(canManageBranches("manager")).toBe(true);
    expect(canManageBranches("editor")).toBe(false);

    // Editor can manage menu
    expect(canManageMenu("editor")).toBe(true);
    expect(canManageMenu("staff")).toBe(false);

    // Staff can manage orders
    expect(canManageOrders("staff")).toBe(true);
    expect(canManageOrders("read_only")).toBe(false);
  });
});
