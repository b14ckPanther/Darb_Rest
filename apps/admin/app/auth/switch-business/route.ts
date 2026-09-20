import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { resolveTenantContext } from "../../../lib/tenant-resolver";
import { COOKIE_KEYS, DEFAULT_LOCALE } from "@darb-rest/config";

export async function POST(request: NextRequest) {
  const cookieStore = await cookies();
  const locale = cookieStore.get(COOKIE_KEYS.LOCALE)?.value || DEFAULT_LOCALE;

  let businessId: string | null = null;
  let redirectPath = `/${locale}`;

  // Accept both form data and json
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      const body = await request.json();
      businessId = body.businessId;
      if (body.redirectUrl) redirectPath = body.redirectUrl;
    } catch {
      // Invalid JSON
    }
  } else {
    try {
      const formData = await request.formData();
      businessId = formData.get("businessId") as string;
      const formRedirect = formData.get("redirectUrl") as string;
      if (formRedirect) redirectPath = formRedirect;
    } catch {
      // Invalid Form
    }
  }

  if (!businessId) {
    return NextResponse.redirect(new URL(redirectPath, request.url), { status: 303 });
  }

  // 1. Resolve current tenant context (strictly validates user authentication)
  const tenantContext = await resolveTenantContext();
  if (!tenantContext || !tenantContext.user) {
    return NextResponse.redirect(new URL(`/${locale}/auth/signin`, request.url), { status: 303 });
  }

  // 2. Authorization validation: Check if user has membership in requested business
  const isAuthorized = tenantContext.accessibleBusinesses.some((b) => b.id === businessId);

  if (isAuthorized) {
    // Valid membership verified: set active business cookie
    cookieStore.set(COOKIE_KEYS.ACTIVE_BUSINESS, businessId, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    // Reset active location so it defaults to the new business's primary location
    cookieStore.delete(COOKIE_KEYS.ACTIVE_LOCATION);
  }

  return NextResponse.redirect(new URL(redirectPath, request.url), { status: 303 });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");
  const cookieStore = await cookies();
  const locale = cookieStore.get(COOKIE_KEYS.LOCALE)?.value || DEFAULT_LOCALE;
  const redirectPath = searchParams.get("redirectUrl") || `/${locale}`;

  if (!businessId) {
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  const tenantContext = await resolveTenantContext();
  if (!tenantContext || !tenantContext.user) {
    return NextResponse.redirect(new URL(`/${locale}/auth/signin`, request.url));
  }

  const isAuthorized = tenantContext.accessibleBusinesses.some((b) => b.id === businessId);
  if (isAuthorized) {
    cookieStore.set(COOKIE_KEYS.ACTIVE_BUSINESS, businessId, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30,
    });
    cookieStore.delete(COOKIE_KEYS.ACTIVE_LOCATION);
  }

  return NextResponse.redirect(new URL(redirectPath, request.url));
}
