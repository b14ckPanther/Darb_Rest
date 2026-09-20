import { cache } from "react";
import { cookies } from "next/headers";
import { getServerClient } from "@darb-rest/supabase/server";
import { resolveEntitlements } from "@darb-rest/supabase";
import { COOKIE_KEYS } from "@darb-rest/config";
import type { Database } from "@darb-rest/supabase";
import type {
  TenantContext,
  AccessibleBusiness,
  UserProfile,
  Business,
  BranchLocation,
  Membership,
  TenantRole,
  PlanEntitlement,
  BusinessFeatureOverride,
  FeatureFlag,
  SupportedLocale,
} from "@darb-rest/types";

// Seed / Mock Data for development and offline testing environments
const SEED_USERS: Record<
  string,
  {
    profile: UserProfile;
    memberships: Array<{
      business: Business;
      role: TenantRole;
      locations: BranchLocation[];
      planEntitlements: PlanEntitlement[];
      overrides: BusinessFeatureOverride[];
    }>;
  }
> = {
  "owner@darb.co.il": {
    profile: {
      id: "u1111111-1111-1111-1111-111111111111",
      email: "owner@darb.co.il",
      fullName: "Darb Owner",
      phone: "+972500000001",
      preferredLocale: "ar",
      isPlatformAdmin: false,
      createdAt: "2026-09-18T00:00:00Z",
      updatedAt: "2026-09-18T00:00:00Z",
    },
    memberships: [
      {
        business: {
          id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          slug: "darb-bistro",
          name: { ar: "درب بيسترو", he: "דרב ביסטרו", en: "Darb Bistro" },
          legalName: "Darb Bistro Ltd",
          businessType: "restaurant",
          status: "active",
          defaultLocale: "ar",
          timezone: "Asia/Jerusalem",
          currency: "ILS",
          planId: "22222222-2222-2222-2222-222222222222",
          createdAt: "2026-09-18T00:00:00Z",
          updatedAt: "2026-09-18T00:00:00Z",
        },
        role: "owner",
        locations: [
          {
            id: "l1111111-1111-1111-1111-111111111111",
            businessId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            name: { ar: "فرع ميناء حيفا", he: "סניף נמל חיפה", en: "Haifa Port Branch" },
            slug: "haifa-port",
            phone: "+97248000001",
            email: "haifa@darb-bistro.co.il",
            addressLine1: "Port Street 12",
            city: "Haifa",
            country: "IL",
            isPrimary: true,
            status: "active",
            operatingHours: [
              {
                id: "oh-1",
                locationId: "l1111111-1111-1111-1111-111111111111",
                dayOfWeek: 1,
                openTime: "08:00",
                closeTime: "23:00",
                isClosed: false,
              },
              {
                id: "oh-2",
                locationId: "l1111111-1111-1111-1111-111111111111",
                dayOfWeek: 2,
                openTime: "08:00",
                closeTime: "23:00",
                isClosed: false,
              },
              {
                id: "oh-3",
                locationId: "l1111111-1111-1111-1111-111111111111",
                dayOfWeek: 3,
                openTime: "08:00",
                closeTime: "23:00",
                isClosed: false,
              },
              {
                id: "oh-4",
                locationId: "l1111111-1111-1111-1111-111111111111",
                dayOfWeek: 4,
                openTime: "08:00",
                closeTime: "23:00",
                isClosed: false,
              },
              {
                id: "oh-5",
                locationId: "l1111111-1111-1111-1111-111111111111",
                dayOfWeek: 5,
                openTime: "08:00",
                closeTime: "00:00",
                isClosed: false,
              },
              {
                id: "oh-6",
                locationId: "l1111111-1111-1111-1111-111111111111",
                dayOfWeek: 6,
                openTime: "09:00",
                closeTime: "00:00",
                isClosed: false,
              },
              {
                id: "oh-7",
                locationId: "l1111111-1111-1111-1111-111111111111",
                dayOfWeek: 7,
                openTime: "10:00",
                closeTime: "22:00",
                isClosed: false,
              },
            ],
            createdAt: "2026-09-18T00:00:00Z",
            updatedAt: "2026-09-18T00:00:00Z",
          },
          {
            id: "l2222222-2222-2222-2222-222222222222",
            businessId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            name: { ar: "فرع عكا القديمة", he: "סניף עכו העתיקה", en: "Old City Akko Branch" },
            slug: "akko-old-city",
            phone: "+97248000002",
            email: "akko@darb-bistro.co.il",
            addressLine1: "Old Harbor Promenade 4",
            city: "Akko",
            country: "IL",
            isPrimary: false,
            status: "active",
            createdAt: "2026-09-18T00:00:00Z",
            updatedAt: "2026-09-18T00:00:00Z",
          },
        ],
        planEntitlements: [
          {
            id: "pe-1",
            planId: "22222222-2222-2222-2222-222222222222",
            featureKey: "digital_menu",
            enabled: true,
            limitValue: null,
            createdAt: "2026-09-18T00:00:00Z",
            updatedAt: "2026-09-18T00:00:00Z",
          },
          {
            id: "pe-2",
            planId: "22222222-2222-2222-2222-222222222222",
            featureKey: "qr_codes",
            enabled: true,
            limitValue: null,
            createdAt: "2026-09-18T00:00:00Z",
            updatedAt: "2026-09-18T00:00:00Z",
          },
          {
            id: "pe-3",
            planId: "22222222-2222-2222-2222-222222222222",
            featureKey: "multi_location",
            enabled: true,
            limitValue: 3,
            createdAt: "2026-09-18T00:00:00Z",
            updatedAt: "2026-09-18T00:00:00Z",
          },
          {
            id: "pe-4",
            planId: "22222222-2222-2222-2222-222222222222",
            featureKey: "online_ordering",
            enabled: true,
            limitValue: null,
            createdAt: "2026-09-18T00:00:00Z",
            updatedAt: "2026-09-18T00:00:00Z",
          },
          {
            id: "pe-5",
            planId: "22222222-2222-2222-2222-222222222222",
            featureKey: "table_ordering",
            enabled: true,
            limitValue: null,
            createdAt: "2026-09-18T00:00:00Z",
            updatedAt: "2026-09-18T00:00:00Z",
          },
          {
            id: "pe-6",
            planId: "22222222-2222-2222-2222-222222222222",
            featureKey: "takeaway",
            enabled: true,
            limitValue: null,
            createdAt: "2026-09-18T00:00:00Z",
            updatedAt: "2026-09-18T00:00:00Z",
          },
          {
            id: "pe-7",
            planId: "22222222-2222-2222-2222-222222222222",
            featureKey: "online_payments",
            enabled: true,
            limitValue: null,
            createdAt: "2026-09-18T00:00:00Z",
            updatedAt: "2026-09-18T00:00:00Z",
          },
          {
            id: "pe-8",
            planId: "22222222-2222-2222-2222-222222222222",
            featureKey: "custom_branding",
            enabled: true,
            limitValue: null,
            createdAt: "2026-09-18T00:00:00Z",
            updatedAt: "2026-09-18T00:00:00Z",
          },
        ],
        overrides: [],
      },
      {
        business: {
          id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
          slug: "darb-artisan-cafe",
          name: { ar: "مقهى درب المختص", he: "קפה דרב מובחר", en: "Darb Artisan Café" },
          legalName: "Darb Specialty Roasters LLC",
          businessType: "cafe",
          status: "active",
          defaultLocale: "ar",
          timezone: "Asia/Jerusalem",
          currency: "ILS",
          planId: "11111111-1111-1111-1111-111111111111",
          createdAt: "2026-09-18T00:00:00Z",
          updatedAt: "2026-09-18T00:00:00Z",
        },
        role: "admin",
        locations: [
          {
            id: "l3333333-3333-3333-3333-333333333333",
            businessId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
            name: {
              ar: "فرع الناصرة مركز المدينة",
              he: "סניף נצרת מרכז העיר",
              en: "Nazareth Downtown Branch",
            },
            slug: "nazareth-downtown",
            phone: "+97246000001",
            email: "nazareth@darb-cafe.co.il",
            addressLine1: "Paul VI Street 48",
            city: "Nazareth",
            country: "IL",
            isPrimary: true,
            status: "active",
            createdAt: "2026-09-18T00:00:00Z",
            updatedAt: "2026-09-18T00:00:00Z",
          },
        ],
        planEntitlements: [
          {
            id: "pe-9",
            planId: "11111111-1111-1111-1111-111111111111",
            featureKey: "digital_menu",
            enabled: true,
            limitValue: null,
            createdAt: "2026-09-18T00:00:00Z",
            updatedAt: "2026-09-18T00:00:00Z",
          },
          {
            id: "pe-10",
            planId: "11111111-1111-1111-1111-111111111111",
            featureKey: "qr_codes",
            enabled: true,
            limitValue: null,
            createdAt: "2026-09-18T00:00:00Z",
            updatedAt: "2026-09-18T00:00:00Z",
          },
          {
            id: "pe-11",
            planId: "11111111-1111-1111-1111-111111111111",
            featureKey: "multi_location",
            enabled: false,
            limitValue: 1,
            createdAt: "2026-09-18T00:00:00Z",
            updatedAt: "2026-09-18T00:00:00Z",
          },
          {
            id: "pe-12",
            planId: "11111111-1111-1111-1111-111111111111",
            featureKey: "online_ordering",
            enabled: false,
            limitValue: null,
            createdAt: "2026-09-18T00:00:00Z",
            updatedAt: "2026-09-18T00:00:00Z",
          },
        ],
        overrides: [],
      },
    ],
  },
  "haifa-manager@darb.co.il": {
    profile: {
      id: "u2222222-2222-2222-2222-222222222222",
      email: "haifa-manager@darb.co.il",
      fullName: "Haifa Branch Manager",
      phone: "+972500000002",
      preferredLocale: "ar",
      isPlatformAdmin: false,
      createdAt: "2026-09-18T00:00:00Z",
      updatedAt: "2026-09-18T00:00:00Z",
    },
    memberships: [
      {
        business: {
          id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          slug: "darb-bistro",
          name: { ar: "درب بيسترو", he: "דרב ביסטרו", en: "Darb Bistro" },
          legalName: "Darb Bistro Ltd",
          businessType: "restaurant",
          status: "active",
          defaultLocale: "ar",
          timezone: "Asia/Jerusalem",
          currency: "ILS",
          planId: "22222222-2222-2222-2222-222222222222",
          createdAt: "2026-09-18T00:00:00Z",
          updatedAt: "2026-09-18T00:00:00Z",
        },
        role: "manager",
        locations: [
          {
            id: "l1111111-1111-1111-1111-111111111111",
            businessId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            name: { ar: "فرع ميناء حيفا", he: "סניף נמל חיפה", en: "Haifa Port Branch" },
            slug: "haifa-port",
            phone: "+97248000001",
            addressLine1: "Port Street 12",
            city: "Haifa",
            country: "IL",
            isPrimary: true,
            status: "active",
            createdAt: "2026-09-18T00:00:00Z",
            updatedAt: "2026-09-18T00:00:00Z",
          },
        ],
        planEntitlements: [
          {
            id: "pe-1",
            planId: "22222222-2222-2222-2222-222222222222",
            featureKey: "digital_menu",
            enabled: true,
            limitValue: null,
            createdAt: "2026-09-18T00:00:00Z",
            updatedAt: "2026-09-18T00:00:00Z",
          },
          {
            id: "pe-2",
            planId: "22222222-2222-2222-2222-222222222222",
            featureKey: "qr_codes",
            enabled: true,
            limitValue: null,
            createdAt: "2026-09-18T00:00:00Z",
            updatedAt: "2026-09-18T00:00:00Z",
          },
        ],
        overrides: [],
      },
    ],
  },
  "newuser@darb.co.il": {
    profile: {
      id: "u3333333-3333-3333-3333-333333333333",
      email: "newuser@darb.co.il",
      fullName: "New Registered User",
      phone: "+972500000003",
      preferredLocale: "ar",
      isPlatformAdmin: false,
      createdAt: "2026-09-18T00:00:00Z",
      updatedAt: "2026-09-18T00:00:00Z",
    },
    memberships: [], // Triggers no-business state
  },
};

/**
 * Resolves the authenticated user and their active multi-tenant context.
 * Strictly enforces server-side tenant isolation:
 * - Active business cookie is validated against the user's verified active memberships.
 * - Never trusts client-supplied business IDs without membership authorization.
 */
export const resolveTenantContext = cache(async (): Promise<TenantContext | null> => {
  const cookieStore = await cookies();
  const supabase = await getServerClient();

  let userProfile: UserProfile | null;
  let membershipsList: Array<{
    business: Business;
    role: TenantRole;
    locations: BranchLocation[];
    planEntitlements: PlanEntitlement[];
    overrides: BusinessFeatureOverride[];
  }> = [];

  // 1. Check live Supabase Auth session
  const {
    data: { user: authUser },
    error: authError,
  } = await supabase.auth.getUser();

  if (authUser && !authError) {
    // Fetch profile
    const { data: profileRow } = (await supabase
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle()) as { data: Database["public"]["Tables"]["profiles"]["Row"] | null };

    // Use the canonical security-definer check; fail closed on lookup errors.
    const { data: platformAdmin, error: platformError } = await supabase.rpc("is_platform_admin", {
      target_user_id: authUser.id,
    });
    if (platformError) throw Error("platform_role_unavailable");

    userProfile = {
      id: authUser.id,
      email: authUser.email || "",
      fullName: profileRow?.full_name ?? authUser.email?.split("@")[0] ?? "User",
      phone: profileRow?.phone ?? undefined,
      preferredLocale: (profileRow?.preferred_locale as "ar" | "he" | "en") ?? "ar",
      isPlatformAdmin: platformAdmin === true,
      createdAt: profileRow?.created_at ?? authUser.created_at,
      updatedAt: profileRow?.updated_at ?? authUser.created_at,
    };

    // Fetch memberships
    const { data: membershipRows } = (await supabase
      .from("memberships")
      .select(
        `
        id,
        user_id,
        business_id,
        role,
        status,
        created_at,
        updated_at,
        business:businesses (
          id,
          slug,
          name,
          legal_name,
          business_type,
          status,
          default_locale,
          timezone,
          currency,
          plan_id,
          created_at,
          updated_at,
          disabled_at
        )
      `,
      )
      .eq("user_id", authUser.id)
      .eq("status", "active")) as {
      data: Array<{
        id: string;
        user_id: string;
        business_id: string;
        role: string;
        status: string;
        created_at: string;
        updated_at: string;
        business: Database["public"]["Tables"]["businesses"]["Row"] | null;
      }> | null;
    };

    if (membershipRows && membershipRows.length > 0) {
      const businessIds = membershipRows
        .filter((m) => m.business?.status === "active")
        .map((m) => m.business_id);
      const planIds = [
        ...new Set(
          membershipRows.flatMap((m) => (m.business?.plan_id ? [m.business.plan_id] : [])),
        ),
      ];
      // Batch across accessible tenants; retain RLS and paginate to avoid the API row cap.
      async function allRows<T>(
        query: (start: number, end: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
      ) {
        const rows: T[] = [];
        for (let start = 0; ; start += 1000) {
          const result = await query(start, start + 999);
          if (result.error) throw result.error;
          rows.push(...(result.data ?? []));
          if ((result.data?.length ?? 0) < 1000) return rows;
        }
      }
      const [allLocations, allEntitlements, allOverrides] = await Promise.all([
        businessIds.length
          ? allRows((start, end) =>
              supabase
                .from("locations")
                .select(
                  "id,business_id,name,slug,phone,email,address_line1,address_line2,city,country,latitude,longitude,timezone,is_primary,status,created_at,updated_at",
                )
                .in("business_id", businessIds)
                .eq("status", "active")
                .order("is_primary", { ascending: false })
                .order("id")
                .range(start, end),
            )
          : [],
        planIds.length
          ? allRows((start, end) =>
              supabase
                .from("plan_entitlements")
                .select("id,plan_id,feature_key,enabled,limit_value,created_at,updated_at")
                .in("plan_id", planIds)
                .order("id")
                .range(start, end),
            )
          : [],
        businessIds.length
          ? allRows((start, end) =>
              supabase
                .from("business_feature_overrides")
                .select(
                  "id,business_id,feature_key,enabled,limit_value,reason,expires_at,created_at,updated_at",
                )
                .in("business_id", businessIds)
                .order("id")
                .range(start, end),
            )
          : [],
      ]);
      for (const m of membershipRows) {
        const b = m.business;
        if (!b || b.status !== "active") continue;

        const businessObj: Business = {
          id: b.id,
          slug: b.slug,
          name:
            typeof b.name === "object" && b.name !== null
              ? (b.name as Record<SupportedLocale, string>)
              : { ar: String(b.name), he: String(b.name), en: String(b.name) },
          legalName: b.legal_name ?? undefined,
          businessType: b.business_type as "restaurant" | "cafe",
          status: b.status as "pending" | "active" | "suspended" | "archived",
          defaultLocale: (b.default_locale as SupportedLocale) ?? "ar",
          timezone: b.timezone,
          currency: b.currency,
          planId: b.plan_id ?? undefined,
          createdAt: b.created_at,
          updatedAt: b.updated_at,
          disabledAt: b.disabled_at ?? undefined,
        };

        const locRows = allLocations.filter((l) => l.business_id === businessObj.id);

        const locations: BranchLocation[] = (locRows || []).map((l) => ({
          id: l.id,
          businessId: l.business_id,
          name:
            typeof l.name === "object" && l.name !== null
              ? (l.name as Record<SupportedLocale, string>)
              : { ar: String(l.name), he: String(l.name), en: String(l.name) },
          slug: l.slug,
          phone: l.phone ?? undefined,
          email: l.email ?? undefined,
          addressLine1: l.address_line1,
          addressLine2: l.address_line2 ?? undefined,
          city: l.city,
          country: l.country,
          latitude: l.latitude ? Number(l.latitude) : undefined,
          longitude: l.longitude ? Number(l.longitude) : undefined,
          timezone: l.timezone ?? undefined,
          isPrimary: l.is_primary,
          status: l.status as "active" | "inactive" | "temporarily_closed",
          createdAt: l.created_at,
          updatedAt: l.updated_at,
        }));

        // Fetch plan entitlements
        let planEntitlements: PlanEntitlement[] = [];
        if (businessObj.planId) {
          const peRows = allEntitlements.filter((pe) => pe.plan_id === businessObj.planId);

          if (peRows) {
            planEntitlements = peRows.map((pe) => ({
              id: pe.id,
              planId: pe.plan_id,
              featureKey: pe.feature_key as FeatureFlag,
              enabled: pe.enabled,
              limitValue: pe.limit_value ?? null,
              createdAt: pe.created_at,
              updatedAt: pe.updated_at,
            }));
          }
        }

        const ovRows = allOverrides.filter((ov) => ov.business_id === businessObj.id);

        const overrides: BusinessFeatureOverride[] = (ovRows || []).map((ov) => ({
          id: ov.id,
          businessId: ov.business_id,
          featureKey: ov.feature_key as FeatureFlag,
          enabled: ov.enabled,
          limitValue: ov.limit_value ?? null,
          reason: ov.reason ?? undefined,
          expiresAt: ov.expires_at ?? undefined,
          createdAt: ov.created_at,
          updatedAt: ov.updated_at,
        }));

        membershipsList.push({
          business: businessObj,
          role: m.role as TenantRole,
          locations,
          planEntitlements,
          overrides,
        });
      }
    }
  } else {
    // 2. Fallback: Check for development / test session cookie in non-production environments
    const devSessionEmail = cookieStore.get("darb_rest_dev_session")?.value;
    if (process.env.NODE_ENV !== "production" && devSessionEmail && SEED_USERS[devSessionEmail]) {
      const devSeed = SEED_USERS[devSessionEmail];
      userProfile = { ...devSeed.profile };
      membershipsList = devSeed.memberships.map((m) => ({
        ...m,
        locations: [...m.locations],
        planEntitlements: [...m.planEntitlements],
        overrides: [...m.overrides],
      }));
    } else {
      return null;
    }
  }

  if (!userProfile) {
    return null;
  }

  // 2.5 Merge dynamic memberships created via onboarding or branch management in non-production
  if (process.env.NODE_ENV !== "production") {
    // 1. In-memory store (bypasses 4KB cookie limits and serialization)
    if (globalThis.__DARB_REST_DEV_MEMBERSHIPS__) {
      const devStoreList = globalThis.__DARB_REST_DEV_MEMBERSHIPS__.get(userProfile.email) || [];
      for (const item of devStoreList) {
        const existingIdx = membershipsList.findIndex((m) => m.business.id === item.business.id);
        if (existingIdx >= 0) {
          membershipsList[existingIdx] = item;
        } else {
          membershipsList.push(item);
        }
      }
    }

    // 2. Dynamic cookie fallback
    const dynamicCookie = cookieStore.get("darb_rest_dynamic_memberships")?.value;
    if (dynamicCookie) {
      try {
        const decoded = dynamicCookie.includes("%")
          ? decodeURIComponent(dynamicCookie)
          : dynamicCookie;
        const dynamicList = JSON.parse(decoded);
        for (const item of dynamicList) {
          if (!item.userEmail || item.userEmail === userProfile.email) {
            const existingIdx = membershipsList.findIndex(
              (m) => m.business.id === item.business.id,
            );
            if (existingIdx >= 0) {
              membershipsList[existingIdx] = item;
            } else {
              membershipsList.push(item);
            }
          }
        }
      } catch {
        // Ignore JSON parse errors on cookies
      }
    }
  }

  // 3. Compute Accessible Businesses
  const accessibleBusinesses: AccessibleBusiness[] = membershipsList.map((m) => {
    const rawName = m.business.name;
    const displayName =
      typeof rawName === "object" && rawName !== null
        ? (rawName as Record<string, string>).en ||
          Object.values(rawName as Record<string, string>)[0] ||
          ""
        : String(rawName);

    return {
      id: m.business.id,
      slug: m.business.slug,
      name: displayName,
      businessType: m.business.businessType,
      role: m.role,
    };
  });

  // 4. Explicit, Secure Active Business Resolution
  const activeBusinessCookie = cookieStore.get(COOKIE_KEYS.ACTIVE_BUSINESS)?.value;

  // Validate that requested business is actually accessible to this user
  let activeEntry = membershipsList.find((m) => m.business.id === activeBusinessCookie);

  // Fallback: Default safely to the first accessible business
  if (!activeEntry && membershipsList.length > 0) {
    activeEntry = membershipsList[0];
  }

  const activeBusiness = activeEntry?.business ?? null;
  const activeMembership: Membership | null = activeEntry
    ? {
        id: `m-${userProfile.id}-${activeEntry.business.id}`,
        userId: userProfile.id,
        businessId: activeEntry.business.id,
        role: activeEntry.role,
        status: "active",
        createdAt: activeEntry.business.createdAt,
        updatedAt: activeEntry.business.updatedAt,
      }
    : null;

  // 5. Active Location Resolution
  const availableLocations = activeEntry?.locations ?? [];
  const activeLocationCookie = cookieStore.get(COOKIE_KEYS.ACTIVE_LOCATION)?.value;

  let activeLocation = availableLocations.find((l) => l.id === activeLocationCookie);
  if (!activeLocation && availableLocations.length > 0) {
    activeLocation = availableLocations.find((l) => l.isPrimary) || availableLocations[0];
  }

  // 6. Resolve Entitlements
  const entitlements = resolveEntitlements(
    activeEntry?.planEntitlements ?? [],
    activeEntry?.overrides ?? [],
  );

  return {
    user: userProfile,
    activeBusiness,
    activeMembership,
    activeLocation: activeLocation ?? null,
    availableLocations,
    accessibleBusinesses,
    entitlements,
  };
});
