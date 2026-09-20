import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { COOKIE_KEYS, DEFAULT_LOCALE } from "@darb-rest/config";

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Dev login is disabled in production" }, { status: 403 });
  }

  const cookieStore = await cookies();
  const locale = cookieStore.get(COOKIE_KEYS.LOCALE)?.value || DEFAULT_LOCALE;

  let email: string | null;
  let redirectUrl = `/${locale}`;

  try {
    const body = await request.json();
    email = body.email;
    if (body.redirectUrl) redirectUrl = body.redirectUrl;
  } catch {
    const formData = await request.formData();
    email = formData.get("email") as string | null;
    const fRedirect = formData.get("redirectUrl") as string | null;
    if (fRedirect) redirectUrl = fRedirect;
  }

  if (email) {
    cookieStore.set("darb_rest_dev_session", email, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });
    // Reset active business and location to ensure fresh context for the new user
    cookieStore.delete(COOKIE_KEYS.ACTIVE_BUSINESS);
    cookieStore.delete(COOKIE_KEYS.ACTIVE_LOCATION);

    if (email === "newuser@darb.co.il") {
      cookieStore.delete("darb_rest_dynamic_memberships");
      cookieStore.delete("darb_rest_onboarding_draft");
      cookieStore.delete(COOKIE_KEYS.ONBOARDING_DRAFT);
      if (globalThis.__DARB_REST_DEV_MEMBERSHIPS__) {
        globalThis.__DARB_REST_DEV_MEMBERSHIPS__.delete("newuser@darb.co.il");
      }
    }
  }

  return NextResponse.redirect(new URL(redirectUrl, request.url), { status: 303 });
}

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Dev login is disabled in production" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  const cookieStore = await cookies();
  const locale = cookieStore.get(COOKIE_KEYS.LOCALE)?.value || DEFAULT_LOCALE;
  const redirectUrl = searchParams.get("redirectUrl") || `/${locale}`;

  if (email) {
    cookieStore.set("darb_rest_dev_session", email, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
    });
    cookieStore.delete(COOKIE_KEYS.ACTIVE_BUSINESS);
    cookieStore.delete(COOKIE_KEYS.ACTIVE_LOCATION);

    if (email === "newuser@darb.co.il") {
      cookieStore.delete("darb_rest_dynamic_memberships");
      cookieStore.delete("darb_rest_onboarding_draft");
      cookieStore.delete(COOKIE_KEYS.ONBOARDING_DRAFT);
      if (globalThis.__DARB_REST_DEV_MEMBERSHIPS__) {
        globalThis.__DARB_REST_DEV_MEMBERSHIPS__.delete("newuser@darb.co.il");
      }
    }
  }

  return NextResponse.redirect(new URL(redirectUrl, request.url));
}
