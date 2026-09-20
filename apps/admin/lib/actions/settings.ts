"use server";

import { encodeDevMemberships, decodeDevMemberships } from "../dev-memberships";
import { cookies } from "next/headers";
import { getServerClient } from "@darb-rest/supabase/server";
import {
  businessUpdateSchema,
  businessSettingsUpdateSchema,
  type BusinessUpdateInput,
  type BusinessSettingsUpdateInput,
} from "@darb-rest/validation";
import { resolveTenantContext } from "../tenant-resolver";

/**
 * Updates basic business identity (name, legal name, locale, timezone, currency).
 * Strictly requires 'owner' or 'admin' role.
 */
export async function updateBusinessInfoAction(
  rawInput: BusinessUpdateInput,
): Promise<{ success: boolean; error?: string }> {
  const parseResult = businessUpdateSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return { success: false, error: parseResult.error.errors[0]?.message || "Invalid input" };
  }

  const context = await resolveTenantContext();
  if (!context?.activeBusiness) {
    return { success: false, error: "Unauthorized: No active business context" };
  }

  const role = context.activeMembership?.role;
  if (!role || !["owner", "admin"].includes(role)) {
    return {
      success: false,
      error: "Forbidden: Only owners and admins can update business details",
    };
  }

  const businessId = context.activeBusiness.id;
  const data = parseResult.data;
  interface DbTableClient {
    update: (data: unknown) => { eq: (col: string, val: unknown) => Promise<{ error: unknown }> };
  }
  const supabase = await getServerClient();

  try {
    await (supabase.from("businesses") as unknown as DbTableClient)
      .update(data)
      .eq("id", businessId);
  } catch {
    // Database offline fallback
  }

  // Update dynamic non-production store
  const cookieStore = await cookies();
  const dynamicCookie = cookieStore.get("darb_rest_dynamic_memberships")?.value;
  if (dynamicCookie) {
    try {
      const list = decodeDevMemberships(dynamicCookie);
      const target = list.find((m: { business: { id: string } }) => m.business.id === businessId);
      if (target) {
        Object.assign(target.business, data);
        cookieStore.set("darb_rest_dynamic_memberships", encodeDevMemberships(list), {
          path: "/",
          httpOnly: true,
          sameSite: "lax",
          maxAge: 60 * 60 * 24 * 7,
        });
      }
    } catch {
      // Ignore
    }
  }

  return { success: true };
}

/**
 * Updates public contact information. Branding is exclusively managed through Appearance.
 * Strictly requires 'owner' or 'admin' role.
 */
export async function updateBusinessSettingsAction(
  rawInput: BusinessSettingsUpdateInput,
): Promise<{ success: boolean; error?: string }> {
  const parseResult = businessSettingsUpdateSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.errors[0]?.message || "Invalid settings input",
    };
  }

  const context = await resolveTenantContext();
  if (!context?.activeBusiness) {
    return { success: false, error: "Unauthorized" };
  }

  const role = context.activeMembership?.role;
  if (!role || !["owner", "admin"].includes(role)) {
    return { success: false, error: "Forbidden" };
  }

  const businessId = context.activeBusiness.id;
  const { phonePublic, emailPublic, websiteUrl, instagramUrl, facebookUrl, cancellationPolicy } =
    parseResult.data;
  const data = {
    phonePublic,
    emailPublic,
    websiteUrl,
    instagramUrl,
    facebookUrl,
    cancellationPolicy,
  };

  // In development / testing environments, persist to in-memory store
  if (process.env.NODE_ENV !== "production") {
    if (!globalThis.__DARB_REST_DEV_SETTINGS__) {
      globalThis.__DARB_REST_DEV_SETTINGS__ = new Map();
    }
    const current = globalThis.__DARB_REST_DEV_SETTINGS__.get(businessId) || {};
    globalThis.__DARB_REST_DEV_SETTINGS__.set(businessId, { ...current, ...data });
  }

  const supabase = await getServerClient();

  interface DbUpsertClient {
    upsert: (data: unknown, opts: unknown) => Promise<{ error: unknown }>;
  }

  try {
    await (supabase.from("business_settings") as unknown as DbUpsertClient).upsert(
      {
        business_id: businessId,
        phone_public: phonePublic,
        email_public: emailPublic,
        website_url: websiteUrl,
        instagram_url: instagramUrl,
        facebook_url: facebookUrl,
        cancellation_policy: cancellationPolicy,
      },
      { onConflict: "business_id" },
    );
  } catch {
    // Database offline fallback
  }

  return { success: true };
}
