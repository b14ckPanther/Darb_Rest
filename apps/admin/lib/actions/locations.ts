"use server";

import { cookies } from "next/headers";
import { getServerClient } from "@darb-rest/supabase/server";
import { COOKIE_KEYS } from "@darb-rest/config";
import {
  branchLocationCreateSchema,
  branchLocationUpdateSchema,
  type BranchLocationCreateInput,
  type BranchLocationUpdateInput,
} from "@darb-rest/validation";
import { resolveTenantContext } from "../tenant-resolver";
import type { BranchLocation, OperatingHour, SupportedLocale, DayOfWeek } from "@darb-rest/types";

/**
 * Creates a new branch location for the active business.
 * Strictly verifies tenant permissions: only 'owner', 'admin', or 'manager' roles.
 * Also verifies plan entitlements for maximum allowed branches.
 */
export async function createBranchAction(
  rawInput: BranchLocationCreateInput,
): Promise<{ success: boolean; locationId?: string; error?: string }> {
  const parseResult = branchLocationCreateSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.errors[0]?.message || "Invalid branch details",
    };
  }

  const data = parseResult.data;
  const context = await resolveTenantContext();

  if (!context?.activeBusiness || context.activeBusiness.id !== data.businessId) {
    return { success: false, error: "Unauthorized: Active business mismatch" };
  }

  const userRole = context.activeMembership?.role;
  if (!userRole || !["owner", "admin", "manager"].includes(userRole)) {
    return { success: false, error: "Forbidden: You lack permissions to add branches" };
  }

  // Check multi-location entitlement
  const multiLocEntitlement = context.entitlements.multi_location;
  if (!multiLocEntitlement.enabled && context.availableLocations.length >= 1) {
    return {
      success: false,
      error: "Plan limit reached: Your current plan does not support multiple branch locations.",
    };
  }
  if (
    multiLocEntitlement.limitValue !== null &&
    multiLocEntitlement.limitValue !== undefined &&
    context.availableLocations.length >= multiLocEntitlement.limitValue
  ) {
    return {
      success: false,
      error: `Plan limit reached: Maximum ${multiLocEntitlement.limitValue} locations allowed on your tier.`,
    };
  }

  const locationId = crypto.randomUUID();
  const now = new Date().toISOString();
  const cookieStore = await cookies();
  const supabase = await getServerClient();

  interface DbTableClient {
    insert: (data: unknown) => Promise<{ error: unknown }>;
  }

  // Try live database insert
  try {
    const { error: dbError } = await (
      supabase.from("locations") as unknown as DbTableClient
    ).insert({
      id: locationId,
      business_id: data.businessId,
      slug: data.slug,
      name: data.name,
      phone: data.phone || null,
      email: data.email || null,
      address_line1: data.addressLine1,
      address_line2: data.addressLine2 || null,
      city: data.city,
      state_region: data.stateRegion || null,
      postal_code: data.postalCode || null,
      country: data.country,
      latitude: data.latitude || null,
      longitude: data.longitude || null,
      timezone: data.timezone || context.activeBusiness.timezone,
      is_primary: data.isPrimary,
      status: data.status,
    });

    if (!dbError && data.operatingHours && data.operatingHours.length > 0) {
      const hoursPayload = data.operatingHours.map(
        (h: { dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean }) => ({
          location_id: locationId,
          day_of_week: h.dayOfWeek,
          open_time: h.openTime,
          close_time: h.closeTime,
          is_closed: h.isClosed,
        }),
      );
      await (supabase.from("location_operating_hours") as unknown as DbTableClient).insert(
        hoursPayload,
      );
    }
  } catch {
    // Live db offline fallback
  }

  // Update dynamic store in non-production environments
  const newOperatingHours: OperatingHour[] = (data.operatingHours || []).map(
    (
      h: { dayOfWeek: number; openTime: string; closeTime: string; isClosed: boolean },
      idx: number,
    ) => ({
      id: `oh-${locationId}-${idx}`,
      locationId,
      dayOfWeek: h.dayOfWeek as DayOfWeek,
      openTime: h.openTime,
      closeTime: h.closeTime,
      isClosed: h.isClosed,
    }),
  );

  const newLocation: BranchLocation = {
    id: locationId,
    businessId: data.businessId,
    slug: data.slug,
    name: data.name as Record<SupportedLocale, string>,
    phone: data.phone,
    email: data.email,
    addressLine1: data.addressLine1,
    addressLine2: data.addressLine2,
    city: data.city,
    country: data.country,
    latitude: data.latitude,
    longitude: data.longitude,
    timezone: data.timezone || context.activeBusiness.timezone,
    isPrimary: data.isPrimary,
    status: data.status,
    operatingHours: newOperatingHours,
    createdAt: now,
    updatedAt: now,
  };

  const dynamicCookie = cookieStore.get("darb_rest_dynamic_memberships")?.value;
  if (dynamicCookie) {
    try {
      const list = JSON.parse(dynamicCookie);
      const target = list.find(
        (m: { business: { id: string } }) => m.business.id === data.businessId,
      );
      if (target) {
        if (data.isPrimary) {
          target.locations.forEach((l: BranchLocation) => {
            l.isPrimary = false;
          });
        }
        target.locations.push(newLocation);
        cookieStore.set("darb_rest_dynamic_memberships", JSON.stringify(list), {
          path: "/",
          httpOnly: true,
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7,
        });
      }
    } catch {
      // Ignore parse errors
    }
  }

  return { success: true, locationId };
}

/**
 * Updates an existing branch's settings.
 */
export async function updateBranchAction(
  locationId: string,
  rawInput: BranchLocationUpdateInput,
): Promise<{ success: boolean; error?: string }> {
  const parseResult = branchLocationUpdateSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return { success: false, error: parseResult.error.errors[0]?.message || "Invalid updates" };
  }

  const context = await resolveTenantContext();
  if (!context?.activeBusiness) {
    return { success: false, error: "Unauthorized" };
  }

  const userRole = context.activeMembership?.role;
  if (!userRole || !["owner", "admin", "manager"].includes(userRole)) {
    return { success: false, error: "Forbidden" };
  }

  const cookieStore = await cookies();
  const dynamicCookie = cookieStore.get("darb_rest_dynamic_memberships")?.value;
  if (dynamicCookie) {
    try {
      const list = JSON.parse(dynamicCookie);
      const target = list.find(
        (m: { business: { id: string } }) => m.business.id === context.activeBusiness!.id,
      );
      if (target) {
        const loc = target.locations.find((l: BranchLocation) => l.id === locationId);
        if (loc) {
          Object.assign(loc, parseResult.data);
          cookieStore.set("darb_rest_dynamic_memberships", JSON.stringify(list), {
            path: "/",
            httpOnly: true,
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 7,
          });
        }
      }
    } catch {
      // Ignore parse errors
    }
  }

  return { success: true };
}

/**
 * Sets the active location cookie.
 */
export async function setActiveBranchAction(locationId: string): Promise<{ success: boolean }> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_KEYS.ACTIVE_LOCATION, locationId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });
  return { success: true };
}
