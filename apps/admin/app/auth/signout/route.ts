import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getServerClient } from "@darb-rest/supabase/server";
import { COOKIE_KEYS, DEFAULT_LOCALE } from "@darb-rest/config";

async function handleSignOut(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = await getServerClient();

  // 1. Sign out from Supabase Auth
  try {
    await supabase.auth.signOut();
  } catch {
    // Ignore if session already invalid
  }

  // 2. Clear development/test cookies and tenant selection cookies
  cookieStore.delete("darb_rest_dev_session");
  cookieStore.delete(COOKIE_KEYS.ACTIVE_BUSINESS);
  cookieStore.delete(COOKIE_KEYS.ACTIVE_LOCATION);

  // 3. Resolve redirect destination
  const locale = cookieStore.get(COOKIE_KEYS.LOCALE)?.value || DEFAULT_LOCALE;
  const redirectUrl = new URL(`/${locale}/auth/signin`, request.url);

  return NextResponse.redirect(redirectUrl, { status: 303 });
}

export async function POST(request: NextRequest) {
  return handleSignOut(request);
}

export async function GET(request: NextRequest) {
  return handleSignOut(request);
}
