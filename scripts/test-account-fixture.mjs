import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

export const repositoryPath = fileURLToPath(new URL("..", import.meta.url));
export class FixtureConfigError extends Error {}

export const id = (key) => {
  const h = createHash("sha256").update(`darb-test-account-v1:${key}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
export function validateEnvironment(env) {
  if (!["development", "test"].includes(env.NODE_ENV) || env.TEST_ACCOUNT_CONFIRM !== "local-only")
    throw new FixtureConfigError(
      "Use NODE_ENV=development and TEST_ACCOUNT_CONFIRM=local-only. Production is blocked.",
    );
  if (
    env.VERCEL_ENV === "production" ||
    env.APP_ENV === "production" ||
    env.DEPLOYMENT_ENV === "production"
  )
    throw new FixtureConfigError("Production is blocked.");
  if (!env.TEST_ACCOUNT_EMAIL || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.TEST_ACCOUNT_EMAIL))
    throw new FixtureConfigError("TEST_ACCOUNT_EMAIL is required.");
  if (!env.TEST_ACCOUNT_PASSWORD || env.TEST_ACCOUNT_PASSWORD.length < 12)
    throw new FixtureConfigError("TEST_ACCOUNT_PASSWORD must have at least 12 characters.");
}
export function localEndpoint(value) {
  let u;
  try {
    u = new URL(value);
  } catch {
    throw new FixtureConfigError("Local Supabase API URL is invalid.");
  }
  if (
    u.protocol !== "http:" ||
    !["127.0.0.1", "localhost"].includes(u.hostname) ||
    !u.port ||
    u.username ||
    u.password ||
    u.pathname !== "/" ||
    u.search ||
    u.hash
  )
    throw new FixtureConfigError(
      "Only the local Supabase CLI endpoint is supported. Remote seeding is blocked.",
    );
  return u.origin;
}
export const text = (en, ar = en, he = en) => ({ en, ar, he });
const quote = (v) =>
  v === null
    ? "NULL"
    : typeof v === "boolean" || typeof v === "number"
      ? String(v)
      : `'${(typeof v === "object" ? JSON.stringify(v) : v).replaceAll("'", "''")}'`;
const ident = (v) => {
  if (!/^[a-z_][a-z0-9_]*$/.test(v)) throw Error("Invalid SQL identifier");
  return `"${v}"`;
};
export function upsert(table, row, keys = ["id"], insertOnly = false) {
  const cols = Object.keys(row),
    changed = cols.filter((c) => !keys.includes(c));
  return `INSERT INTO public.${ident(table)} (${cols.map(ident).join(",")}) VALUES (${cols.map((c) => quote(row[c])).join(",")}) ON CONFLICT (${keys.map(ident).join(",")}) ${insertOnly ? "DO NOTHING" : `DO UPDATE SET ${changed.map((c) => `${ident(c)}=EXCLUDED.${ident(c)}`).join(",")}`} ;`;
}
export const dishes = [
  text("Garden salad", "سلطة الحديقة", "סלט גינה"),
  text("House latte", "لاتيه البيت", "לאטה הבית"),
  text("Chocolate cake", "كعكة الشوكولاتة", "עוגת שוקולד"),
  text("Sold-out soup", "حساء نفد اليوم", "מרק שאזל"),
  text("Hidden special", "طبق خاص مخفي", "מנה מיוחדת מוסתרת"),
];
export function buildFixture(userId, mediaPaths, tokens, now = new Date()) {
  if (!/^[0-9a-f-]{36}$/.test(userId)) throw Error("Invalid Auth user ID");
  if (tokens.length !== 4 || tokens.some((t) => !/^[0-9a-f]{64}$/.test(t)))
    throw Error("Invalid QR tokens");
  const sql = [
    "BEGIN;",
    "SET LOCAL standard_conforming_strings=on;",
    "SELECT pg_advisory_xact_lock(710010);",
    "SET CONSTRAINTS ALL DEFERRED;",
  ];
  const put = (t, r, k, once = false) => sql.push(upsert(t, r, k, once));
  const B = id("business"),
    plan = id("plan"),
    time = (minutes) => new Date(now.getTime() - minutes * 60000).toISOString();
  // Refuse an existing platform administrator rather than silently bypassing tenant RBAC.
  sql.push(
    `DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.platform_admins WHERE user_id=${quote(userId)}) THEN RAISE EXCEPTION 'Test account must not be a platform administrator'; END IF; END $$;`,
  );
  put("profiles", { id: userId, full_name: "Darb Test Operator", preferred_locale: "en" });
  put("plans", {
    id: plan,
    code: "test-account-full",
    name: text("Dormant development fixtures", "بيانات تطوير مؤجلة", "נתוני פיתוח לא פעילים"),
    is_active: false,
  });
  for (const feature of [
    "digital_menu",
    "qr_codes",
    "multi_location",
    "online_ordering",
    "online_payments",
    "custom_branding",
    "advanced_analytics",
    "table_ordering",
    "takeaway",
    "custom_domains",
    "inventory_tracking",
  ])
    put("plan_entitlements", {
      id: id(`feature:${feature}`),
      plan_id: plan,
      feature_key: feature,
      enabled: true,
      limit_value: null,
    });
  for (const [n, role] of ["owner", "admin", "manager", "editor", "staff", "read_only"].entries()) {
    const business = n === 0 ? B : id(`business:${role}`);
    put("businesses", {
      id: business,
      slug: n === 0 ? "darb-test-restaurant" : `darb-test-${role.replaceAll("_", "-")}`,
      name: text(`TEST Darb ${role}`, `درب تجريبي ${role}`, `דארב בדיקה ${role}`),
      legal_name: "Fictional development fixture",
      business_type: "restaurant",
      status: "active",
      default_locale: "en",
      currency: "ILS",
      timezone: "Asia/Jerusalem",
      plan_id: plan,
      onboarding_step: 4,
    });
    put("memberships", { user_id: userId, business_id: business, role, status: "active" }, [
      "user_id",
      "business_id",
    ]);
    put(
      "business_settings",
      {
        business_id: business,
        primary_color: "#1a3c2a",
        accent_color: "#d5b17a",
        logo_url: "https://placehold.co/240x240/png?text=Darb+Test",
        cover_url: "https://placehold.co/1600x700/png?text=Test+Restaurant",
        cover_video_url: null,
        phone_public: "",
        email_public: "restaurant@example.invalid",
        website_url: "https://example.invalid",
        instagram_url: "",
        facebook_url: "",
        cancellation_policy: "Development orders only. No real fulfillment.",
      },
      ["business_id"],
    );
    if (n > 0)
      put("locations", {
        id: id(`branch:${role}`),
        business_id: business,
        slug: "demo",
        name: text("Demo branch", "فرع تجريبي", "סניף הדגמה"),
        address_line1: "Fictional test address",
        city: "Test City",
        is_primary: true,
        status: "active",
        timezone: "Asia/Jerusalem",
      });
  }
  const appearance = {
    template: "signature",
    version: 1,
    primary: "#1a3c2a",
    accent: "#d5b17a",
    logo: "https://placehold.co/240x240/png?text=Darb+Test",
    cover: "https://placehold.co/1600x700/png?text=Test+Restaurant",
    coverVideo: "",
    density: "balanced",
    images: true,
  };
  put(
    "restaurant_appearance",
    {
      business_id: B,
      published: appearance,
      draft: { ...appearance, template: "editorial" },
      revision: 1,
      published_at: time(0),
    },
    ["business_id"],
  );
  for (let branch = 0; branch < 2; branch++) {
    const location_id = id(`branch:${branch}`),
      scope = { business_id: B, location_id };
    put("locations", {
      id: location_id,
      business_id: B,
      slug: branch ? "garden" : "central",
      name: branch
        ? text("Test Garden", "الحديقة التجريبية", "גן בדיקה")
        : text("Test Central", "المركز التجريبي", "מרכז בדיקה"),
      address_line1: "Fictional test address",
      city: "Test City",
      country: "IL",
      is_primary: !branch,
      status: "active",
      timezone: "Asia/Jerusalem",
    });
    for (let day = 1; day <= 7; day++)
      put("location_operating_hours", {
        id: id(`hours:${branch}:${day}`),
        location_id,
        day_of_week: day,
        open_time: "08:00",
        close_time: "23:00",
        is_closed: day === 7,
      });
    put("branch_staff", { ...scope, user_id: userId }, ["location_id", "user_id"]);
    put(
      "operation_preferences",
      { ...scope, user_id: userId, new_orders: true, ready_orders: branch === 0 },
      ["location_id", "user_id"],
    );
    for (const station of ["Grill", "Bar", "Desserts"])
      put("kitchen_stations", {
        id: id(`station:${branch}:${station}`),
        ...scope,
        name: station,
        is_active: true,
      });
  }
  for (let menu = 0; menu < 3; menu++) {
    put("menus", {
      id: id(`menu:${menu}`),
      business_id: B,
      name_i18n: [
        text("All day", "طوال اليوم", "כל היום"),
        text("Desserts", "حلويات", "קינוחים"),
        text("Seasonal draft", "مسودة موسمية", "טיוטה עונתית"),
      ][menu],
      status: menu === 2 ? "draft" : "active",
      is_default: menu === 0,
      sort_order: menu,
    });
    for (let branch = 0; branch < 2; branch++)
      put("menu_locations", {
        id: id(`menu-location:${menu}:${branch}`),
        business_id: B,
        menu_id: id(`menu:${menu}`),
        location_id: id(`branch:${branch}`),
        is_enabled: menu !== 2,
      });
  }
  for (let section = 0; section < 3; section++)
    put("menu_sections", {
      id: id(`section:${section}`),
      business_id: B,
      menu_id: id(`menu:${section === 2 ? 1 : 0}`),
      name_i18n: [
        text("Kitchen", "المطبخ", "מטבח"),
        text("Coffee", "قهوة", "קפה"),
        text("Bakery", "المخبز", "מאפייה"),
      ][section],
      sort_order: section,
    });
  dishes.forEach((name, n) => {
    put("menu_items", {
      id: id(`item:${n}`),
      business_id: B,
      section_id: id(`section:${n === 1 ? 1 : n === 2 ? 2 : 0}`),
      name_i18n: name,
      description_i18n: text("Fictional test dish", "طبق تجريبي", "מנת בדיקה"),
      base_price: [32, 15, 24, 28, 40][n],
      currency: "ILS",
      is_available: n !== 3,
      is_visible: n !== 4,
      image_path: mediaPaths[n],
      sort_order: n,
    });
  });
  for (let n = 0; n < 2; n++)
    put("item_variants", {
      id: id(`variant:${n}`),
      business_id: B,
      item_id: id("item:1"),
      name_i18n: n ? text("Large", "كبير", "גדול") : text("Regular", "عادي", "רגיל"),
      price: n ? 19 : 15,
      sort_order: n,
    });
  put("modifier_groups", {
    id: id("group"),
    business_id: B,
    name_i18n: text("Milk", "حليب", "חלב"),
    min_select: 1,
    max_select: 1,
    is_required: true,
  });
  for (let n = 0; n < 2; n++)
    put("modifiers", {
      id: id(`modifier:${n}`),
      business_id: B,
      modifier_group_id: id("group"),
      name_i18n: n
        ? text("Oat milk", "حليب الشوفان", "חלב שיבולת שועל")
        : text("Dairy milk", "حليب عادي", "חלב רגיל"),
      price_delta: n ? 3 : 0,
      sort_order: n,
    });
  put("item_modifier_groups", {
    id: id("item-group"),
    business_id: B,
    item_id: id("item:1"),
    modifier_group_id: id("group"),
  });
  put("item_dietary_tags", {
    id: id("diet"),
    business_id: B,
    item_id: id("item:0"),
    code: "vegan",
  });
  for (const code of ["milk", "gluten", "eggs"])
    put("item_allergens", {
      id: id(`allergen:${code}`),
      business_id: B,
      item_id: id("item:2"),
      code,
    });
  for (let n = 0; n < 3; n++)
    put("menu_item_location_overrides", {
      id: id(`override:${n}`),
      business_id: B,
      location_id: id("branch:1"),
      item_id: id(`item:${n}`),
      price_override: n === 0 ? 35 : null,
      is_available_override: n === 2 ? false : null,
      is_visible_override: n === 1 ? false : null,
    });
  for (let branch = 0; branch < 2; branch++)
    for (let section = 0; section < 3; section++)
      put("station_routes", {
        id: id(`route:${branch}:${section}`),
        business_id: B,
        location_id: id(`branch:${branch}`),
        section_id: id(`section:${section}`),
        station_id: id(`station:${branch}:${["Grill", "Bar", "Desserts"][section]}`),
      });
  const scope = { business_id: B, location_id: id("branch:0") };
  for (let n = 0; n < 5; n++) {
    put("restaurant_tables", {
      id: id(`table:${n}`),
      ...scope,
      name: `Test ${n + 1}`,
      area: n < 2 ? "Main" : "Patio",
      is_active: n !== 4,
      operational_state: ["available", "occupied", "needs_attention", "cleaning", "available"][n],
      assigned_user_id: n === 1 ? userId : null,
    });
    if (n < 3)
      put(
        "table_qr_tokens",
        { table_id: id(`table:${n}`), ...scope, token: tokens[n] },
        ["table_id"],
        true,
      );
  }
  // Revoked capability is deliberately absent from the live token table.
  sql.push(`DELETE FROM public.table_qr_tokens WHERE table_id=${quote(id("table:3"))};`);
  put(
    "restaurant_operation_history",
    {
      id: id("revocation"),
      ...scope,
      actor_id: userId,
      action: "fixture_qr_revoked",
      target_id: id("table:3"),
      payload: { revoked_token: tokens[3], fixture: true },
    },
    undefined,
    true,
  );
  const statuses = [
    "draft",
    "submitted",
    "accepted",
    "preparing",
    "ready",
    "completed",
    "cancelled",
  ];
  statuses.forEach((status, n) => {
    const order_id = id(`order:${status}`),
      line = id(`line:${status}`),
      dine = n % 2 === 0;
    // Insert-only operational examples: reruns preserve actions taken in the UI and avoid trigger-generated duplicates.
    put(
      "orders",
      {
        id: order_id,
        ...scope,
        created_by: userId,
        status,
        fulfillment_mode: dine ? "dine_in" : "takeaway",
        table_id: dine ? id("table:1") : null,
        table_name: dine ? "Test 2" : null,
        table_area: dine ? "Main" : null,
        customer_name: `Fictional ${status} guest`,
        customer_phone: "",
        currency: "ILS",
        subtotal_cents: 2200,
        cart: [
          {
            item_id: id("item:1"),
            variant_id: id("variant:1"),
            modifier_ids: [id("modifier:1")],
            quantity: 1,
          },
        ],
        submitted_at: n ? time(30) : null,
        accepted_at: n >= 2 && n < 6 ? time(25) : null,
        prep_started_at: n >= 3 && n < 6 ? time(20) : null,
        ready_at: n >= 4 && n < 6 ? time(10) : null,
        completed_at: n === 5 ? time(5) : null,
        cancellation_reason: n === 6 ? "Fictional customer cancellation" : null,
        is_rush: status === "preparing",
        assigned_user_id: userId,
      },
      undefined,
      true,
    );
    put(
      "order_items",
      {
        id: line,
        order_id,
        business_id: B,
        item_id: id("item:1"),
        variant_id: id("variant:1"),
        name_i18n: dishes[1],
        variant_name_i18n: text("Large", "كبير", "גדול"),
        quantity: 1,
        base_unit_cents: 1900,
        modifier_unit_cents: 300,
        line_total_cents: 2200,
        sort_order: 0,
      },
      undefined,
      true,
    );
    put(
      "order_item_modifiers",
      {
        id: id(`line-mod:${status}`),
        order_item_id: line,
        order_id,
        business_id: B,
        modifier_id: id("modifier:1"),
        group_name_i18n: text("Milk", "حليب", "חלב"),
        name_i18n: text("Oat milk", "حليب الشوفان", "חלב שיבולת שועל"),
        price_cents: 300,
      },
      undefined,
      true,
    );
    const paymentStatus = ["pending", "pending", "paid", "paid", "paid", "paid", "failed"][n];
    put(
      "payments",
      {
        id: id(`payment:${status}`),
        order_id,
        business_id: B,
        method: n % 2 ? "restaurant" : "online",
        provider: n % 2 ? "restaurant" : "local-test",
        provider_reference: `fixture-${status}`,
        reference: id(`receipt:${status}`),
        amount_cents: 2200,
        currency: "ILS",
        status: paymentStatus,
      },
      ["order_id"],
      true,
    );
    if (n) {
      put(
        "order_item_tasks",
        {
          id: id(`task:${status}`),
          ...scope,
          order_id,
          order_item_id: line,
          station_id: id("station:0:Bar"),
          station_name: "Bar",
          state: n === 6 ? "cancelled" : n >= 4 ? "ready" : n === 3 ? "preparing" : "pending",
          started_at: n >= 3 && n < 6 ? time(20) : null,
          ready_at: n >= 4 && n < 6 ? time(10) : null,
        },
        ["order_item_id", "station_id"],
        true,
      );
      put(
        "printer_events",
        {
          id: id(`printer:${status}`),
          ...scope,
          order_id,
          kind: n === 6 ? "cancelled" : n >= 4 ? "ready" : "submitted",
        },
        ["order_id", "kind"],
        true,
      );
      put(
        "restaurant_operation_history",
        {
          id: id(`history:${status}`),
          ...scope,
          actor_id: userId,
          action: "order_status",
          target_id: order_id,
          payload: { from: "draft", to: status, fixture: true },
        },
        undefined,
        true,
      );
      put(
        "order_operations",
        {
          id: id(`operation:${status}`),
          ...scope,
          order_id,
          actor_id: userId,
          expected_revision: 1,
          target_status: status,
          reason: n === 6 ? "Fictional customer cancellation" : null,
        },
        undefined,
        true,
      );
    }
  });
  // Keep historical operations fixtures, but all interactive businesses use the v1 catalog.
  sql.push(
    `DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM public.plans WHERE code='business') THEN RAISE EXCEPTION 'Apply commercial migrations before seeding'; END IF; END $$;`,
  );
  sql.push(
    `UPDATE public.businesses SET plan_id=(SELECT id FROM public.plans WHERE code='business') WHERE plan_id=${quote(plan)};`,
  );
  sql.push(
    `UPDATE public.business_settings SET whatsapp_number='+972501234567' WHERE business_id=${quote(B)};`,
  );
  sql.push("COMMIT;");
  return sql.join("\n");
}
