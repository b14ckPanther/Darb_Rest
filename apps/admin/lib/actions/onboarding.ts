"use server";
import { customerAgreement } from "../customer-activation";
import { platformRole } from "../auth";
import { getCommercialPlans } from "@darb-rest/supabase/commercial";

import { encodeDevMemberships, decodeDevMemberships } from "../dev-memberships";
import { cookies } from "next/headers";
import { getServerClient } from "@darb-rest/supabase/server";
import { COOKIE_KEYS } from "@darb-rest/config";
import {
  completeOnboardingSchema,
  isSlugAllowed,
  normalizeSlug,
  type CompleteOnboardingInput,
} from "@darb-rest/validation";
import type {
  Business,
  BranchLocation,
  OperatingHour,
  PlanEntitlement,
  OnboardingDraft,
  OnboardingDraftCookie,
  SupportedLocale,
  DayOfWeek,
} from "@darb-rest/types";

export interface SlugCheckResult {
  available: boolean;
  slug: string;
  reason?: "invalid" | "reserved" | "taken";
}

/**
 * Validates slug format, verifies against reserved system keywords,
 * and confirms uniqueness against existing database records.
 */
export async function checkSlugAvailability(rawSlug: string): Promise<SlugCheckResult> {
  const normalized = normalizeSlug(rawSlug);

  if (!isSlugAllowed(normalized)) {
    return {
      available: false,
      slug: normalized,
      reason: normalized.length < 3 ? "invalid" : "reserved",
    };
  }

  // 1. Check live database if available
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isRealSupabase = supabaseUrl && !supabaseUrl.includes("placeholder");

  if (isRealSupabase) {
    try {
      const supabase = await getServerClient();
      const { data, error } = await supabase
        .from("businesses")
        .select("id")
        .eq("slug", normalized)
        .maybeSingle();

      if (!error && data) {
        return { available: false, slug: normalized, reason: "taken" };
      }
    } catch {
      // offline database fallback
    }
  }

  // 2. Check dev session dynamic cookies
  const cookieStore = await cookies();
  const dynamicCookie = cookieStore.get("darb_rest_dynamic_memberships")?.value;
  if (dynamicCookie) {
    try {
      const dynamicList = decodeDevMemberships(dynamicCookie);
      const exists = dynamicList.some(
        (m: { business: { slug: string } }) => m.business.slug === normalized,
      );
      if (exists) {
        return { available: false, slug: normalized, reason: "taken" };
      }
    } catch {
      // Ignore malformed cookie
    }
  }

  return { available: true, slug: normalized };
}

interface DevDraftStoreRecord {
  id: string;
  userId: string;
  currentStep: number;
  data: Partial<OnboardingDraft>;
  updatedAt: string;
}

declare global {
  var __DARB_REST_DEV_DRAFTS__: Map<string, DevDraftStoreRecord> | undefined;
}

function getDevDraftStore(): Map<string, DevDraftStoreRecord> {
  if (!globalThis.__DARB_REST_DEV_DRAFTS__) {
    globalThis.__DARB_REST_DEV_DRAFTS__ = new Map<string, DevDraftStoreRecord>();
  }
  return globalThis.__DARB_REST_DEV_DRAFTS__;
}

/**
 * Resolves current authenticated user across live Supabase Auth and non-production sessions.
 */
async function getAuthenticatedUser(): Promise<{ userId: string; userEmail: string } | null> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isRealSupabase = supabaseUrl && !supabaseUrl.includes("placeholder");

  if (isRealSupabase) {
    try {
      const supabase = await getServerClient();
      const { data: authData, error } = await supabase.auth.getUser();
      if (!error && authData?.user) {
        return {
          userId: authData.user.id,
          userEmail: authData.user.email || "",
        };
      }
    } catch {
      // offline fallback
    }
  }

  if (process.env.NODE_ENV !== "production") {
    const cookieStore = await cookies();
    const devEmail = cookieStore.get("darb_rest_dev_session")?.value;
    if (devEmail) {
      const devUserId = devEmail.startsWith("newuser")
        ? "u3333333-3333-3333-3333-333333333333"
        : "u1111111-1111-1111-1111-111111111111";
      return {
        userId: devUserId,
        userEmail: devEmail,
      };
    }
  }

  return null;
}

/**
 * Saves in-progress onboarding state server-side in Supabase (and dev fallback).
 * Stores ONLY minimal state ({ draftId, currentStep }) in the client cookie.
 * Ensures zero sensitive/meaningful business data is stored only in cookies.
 */
export async function saveOnboardingDraft(
  draft: Partial<OnboardingDraft>,
): Promise<{ success: boolean; error?: string }> {
  const user = await getAuthenticatedUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const cookieStore = await cookies();
  const cookieRaw = cookieStore.get(COOKIE_KEYS.ONBOARDING_DRAFT)?.value;
  let draftId = crypto.randomUUID();
  if (cookieRaw) {
    try {
      const parsed = JSON.parse(cookieRaw);
      if (parsed.draftId && typeof parsed.draftId === "string") {
        draftId = parsed.draftId;
      }
    } catch {
      // fresh draftId
    }
  }

  const currentStep = draft.step || 1;
  const now = new Date().toISOString();

  // 1. Persist to server-side Supabase table if available
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isRealSupabase = supabaseUrl && !supabaseUrl.includes("placeholder");

  if (isRealSupabase) {
    try {
      const supabase = await getServerClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      await client.from("onboarding_drafts").upsert(
        {
          id: draftId,
          user_id: user.userId,
          current_step: currentStep,
          data: draft,
          updated_at: now,
        },
        { onConflict: "user_id" },
      );
    } catch {
      // offline database fallback
    }
  }

  // 2. Non-production in-memory server store fallback
  if (process.env.NODE_ENV !== "production") {
    getDevDraftStore().set(user.userId, {
      id: draftId,
      userId: user.userId,
      currentStep,
      data: draft,
      updatedAt: now,
    });
  }

  // 3. Store ONLY minimal state in the cookie (no business data)
  const minimalCookie: OnboardingDraftCookie = {
    draftId,
    currentStep,
  };

  cookieStore.set(COOKIE_KEYS.ONBOARDING_DRAFT, JSON.stringify(minimalCookie), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return { success: true };
}

/**
 * Retrieves saved onboarding draft from server-side Supabase persistence (or dev store).
 * Automatically handles cross-device / fresh-session resumption when authenticated.
 */
export async function getOnboardingDraft(): Promise<Partial<OnboardingDraft> | null> {
  const user = await getAuthenticatedUser();
  if (!user) return null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isRealSupabase = supabaseUrl && !supabaseUrl.includes("placeholder");

  let serverDraft: Partial<OnboardingDraft> | null = null;
  let currentStep = 1;

  // 1. Attempt lookup in Supabase onboarding_drafts table
  if (isRealSupabase) {
    try {
      const supabase = await getServerClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client = supabase as any;
      const { data: record } = await client
        .from("onboarding_drafts")
        .select("id, current_step, data")
        .eq("user_id", user.userId)
        .maybeSingle();

      if (record && record.data) {
        serverDraft = record.data as Partial<OnboardingDraft>;
        currentStep = record.current_step;
      }
    } catch {
      // offline database fallback
    }
  }

  // 2. Non-production dev server fallback
  if (!serverDraft && process.env.NODE_ENV !== "production") {
    const devRecord = getDevDraftStore().get(user.userId);
    if (devRecord) {
      serverDraft = devRecord.data;
      currentStep = devRecord.currentStep;
    }
  }

  if (serverDraft) {
    return {
      ...serverDraft,
      step: currentStep,
    };
  }

  return null;
}

/**
 * Clears saved onboarding draft from server-side database and removes minimal cookie.
 */
export async function clearOnboardingDraft(): Promise<{ success: boolean }> {
  const user = await getAuthenticatedUser();
  if (user) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const isRealSupabase = supabaseUrl && !supabaseUrl.includes("placeholder");
    if (isRealSupabase) {
      try {
        const supabase = await getServerClient();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const client = supabase as any;
        await client.from("onboarding_drafts").delete().eq("user_id", user.userId);
      } catch {
        // ignore
      }
    }

    if (process.env.NODE_ENV !== "production") {
      getDevDraftStore().delete(user.userId);
    }
  }

  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_KEYS.ONBOARDING_DRAFT);
  return { success: true };
}

/**
 * Atomically completes business onboarding:
 * - Validates complete onboarding input.
 * - Authenticates caller server-side.
 * - Creates business with active status.
 * - Sets visual identity & public contact settings.
 * - Assigns authenticated user as owner.
 * - Creates primary branch location & operating schedule.
 * - Refreshes active business and location cookies.
 */
export async function completeOnboarding(
  rawInput: CompleteOnboardingInput,
): Promise<{ success: boolean; businessId?: string; slug?: string; error?: string }> {
  const parseResult = completeOnboardingSchema.safeParse(rawInput);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.errors[0]?.message || "Invalid onboarding details",
    };
  }

  const data = parseResult.data;
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const isRealSupabase = supabaseUrl && !supabaseUrl.includes("placeholder");

  const selectedPlan = (await getCommercialPlans()).find((p) => p.id === data.planId);

  // 1. Authenticate user server-side
  let userId: string | null = null;
  let userEmail: string | null = null;
  let usesRealAuth = false;

  if (isRealSupabase) {
    try {
      const supabase = await getServerClient();
      const { data: authData } = await supabase.auth.getUser();
      if (authData?.user) {
        usesRealAuth = true;
        userId = authData.user.id;
        userEmail = authData.user.email || "";
      }
    } catch {
      // offline fallback
    }
  }

  if (!userId && process.env.NODE_ENV !== "production") {
    // Non-production fallback to dev session
    userEmail = cookieStore.get("darb_rest_dev_session")?.value || null;
    if (userEmail) {
      userId = userEmail.startsWith("newuser")
        ? "u3333333-3333-3333-3333-333333333333"
        : "u1111111-1111-1111-1111-111111111111";
    }
  }

  if (!userId || !userEmail) {
    return { success: false, error: "Unauthorized: You must be logged in to create a business." };
  }

  if (usesRealAuth && !(await platformRole(userId)).data) {
    const record = await customerAgreement(userId);
    if (!record?.activation.activated_at || data.planId !== record.agreement.plan_id)
      return { success: false };
    data.planId = record.agreement.plan_id;
  } else if (!selectedPlan) return { success: false };

  const businessId = crypto.randomUUID();
  const locationId = crypto.randomUUID();
  const now = new Date().toISOString();

  interface DbRpcClient {
    rpc: (func: string, params: unknown) => Promise<{ data: unknown; error: unknown }>;
  }

  // Real sessions must use authoritative database IDs and may never fall back to mock state.
  if (usesRealAuth) {
    try {
      const supabase = await getServerClient();
      const result = await (supabase as unknown as DbRpcClient).rpc("create_onboarding_business", {
        p_slug: data.businessSlug,
        p_name: data.businessName,
        p_legal_name: data.legalName || null,
        p_business_type: data.businessType,
        p_default_locale: data.defaultLocale,
        p_timezone: data.timezone,
        p_currency: data.currency,
        p_plan_id: data.planId || null,
        p_primary_color: data.primaryColor || null,
        p_accent_color: data.accentColor || null,
        p_phone_public: data.phonePublic || null,
        p_email_public: data.emailPublic || null,
        p_website_url: data.websiteUrl || null,
        p_instagram_url: data.instagramUrl || null,
        p_facebook_url: data.facebookUrl || null,
        p_branch_slug: data.branchSlug,
        p_branch_name: data.branchName,
        p_branch_phone: data.branchPhone || null,
        p_branch_email: data.branchEmail || null,
        p_branch_address_line1: data.branchAddressLine1,
        p_branch_city: data.branchCity,
        p_branch_country: data.branchCountry,
        p_hours: data.operatingHours.map((h) => ({
          day_of_week: h.dayOfWeek,
          open_time: h.openTime,
          close_time: h.closeTime,
          is_closed: h.isClosed,
        })),
      });
      const created = result.data as { business_id?: string; location_id?: string } | null;
      if (result.error || !created?.business_id || !created.location_id) return { success: false };
      const options = {
        path: "/",
        httpOnly: true,
        sameSite: "lax" as const,
        maxAge: 60 * 60 * 24 * 30,
      };
      cookieStore.set(COOKIE_KEYS.ACTIVE_BUSINESS, created.business_id, options);
      cookieStore.set(COOKIE_KEYS.ACTIVE_LOCATION, created.location_id, options);
      await clearOnboardingDraft();
      return { success: true, businessId: created.business_id, slug: data.businessSlug };
    } catch {
      return { success: false };
    }
  }
  if (process.env.NODE_ENV === "production") return { success: false };

  if (!selectedPlan) return { success: false };
  // 3. Register created tenant in dynamic store for seamless non-production access
  const newBusiness: Business = {
    id: businessId,
    slug: data.businessSlug,
    name: data.businessName as Record<SupportedLocale, string>,
    legalName: data.legalName,
    businessType: data.businessType,
    status: "active",
    defaultLocale: data.defaultLocale,
    timezone: data.timezone,
    currency: data.currency,
    planId: selectedPlan.id, // Default to starter
    onboardingStep: 7,
    createdAt: now,
    updatedAt: now,
  };

  const newOperatingHours: OperatingHour[] = data.operatingHours.map(
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
      createdAt: now,
      updatedAt: now,
    }),
  );

  const newLocation: BranchLocation = {
    id: locationId,
    businessId,
    slug: data.branchSlug,
    name: data.branchName as Record<SupportedLocale, string>,
    phone: data.branchPhone,
    email: data.branchEmail,
    addressLine1: data.branchAddressLine1,
    addressLine2: data.branchAddressLine2,
    city: data.branchCity,
    country: data.branchCountry,
    latitude: data.branchLatitude,
    longitude: data.branchLongitude,
    timezone: data.timezone,
    isPrimary: true,
    status: "active",
    operatingHours: newOperatingHours,
    createdAt: now,
    updatedAt: now,
  };

  const defaultEntitlements: PlanEntitlement[] = selectedPlan.entitlements.map((e) => ({
    id: crypto.randomUUID(),
    planId: selectedPlan.id,
    featureKey: e.feature_key as PlanEntitlement["featureKey"],
    enabled: e.enabled,
    limitValue: e.limit_value,
    createdAt: now,
    updatedAt: now,
  }));
  let dynamicMemberships: ReturnType<typeof decodeDevMemberships> = [];

  const existingDynamic = cookieStore.get("darb_rest_dynamic_memberships")?.value;
  if (existingDynamic) {
    try {
      dynamicMemberships = decodeDevMemberships(existingDynamic);
    } catch {
      dynamicMemberships = [];
    }
  }

  dynamicMemberships.push({
    userEmail,
    business: newBusiness,
    role: "owner",
    locations: [newLocation],
    planEntitlements: defaultEntitlements,
    overrides: [],
  });

  cookieStore.set("darb_rest_dynamic_memberships", encodeDevMemberships(dynamicMemberships), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  });

  // 4. Update Active Business & Location Context Cookies Immediately
  cookieStore.set(COOKIE_KEYS.ACTIVE_BUSINESS, businessId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });

  cookieStore.set(COOKIE_KEYS.ACTIVE_LOCATION, locationId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
  });

  // 5. Clean up draft from server-side database and cookie
  await clearOnboardingDraft();

  return { success: true, businessId, slug: data.businessSlug };
}
