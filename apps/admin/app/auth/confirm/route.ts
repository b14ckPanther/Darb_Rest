import { NextRequest, NextResponse } from "next/server";
import { getServerClient } from "@darb-rest/supabase/server";
import { isValidLocale } from "@darb-rest/i18n";
import { adminOrigin } from "../../../lib/customer-activation";
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams,
    rawLocale = params.get("locale") ?? "en",
    locale = isValidLocale(rawLocale) ? rawLocale : "en";
  const type = params.get("type"),
    token_hash = params.get("token_hash");
  const destination =
    type === "email_change" || type === "recovery"
      ? `/${locale}/account`
      : `/${locale}/auth/accept-invite`;
  let valid = false;
  if (
    token_hash &&
    token_hash.length <= 256 &&
    ["invite", "email_change", "recovery"].includes(type ?? "")
  ) {
    const { error } = await (
      await getServerClient()
    ).auth.verifyOtp({ token_hash, type: type as "invite" | "email_change" | "recovery" });
    valid = !error;
  }
  const response = NextResponse.redirect(
    new URL(valid ? destination : `/${locale}/auth/accept-invite?result=invalid`, adminOrigin()),
  );
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
