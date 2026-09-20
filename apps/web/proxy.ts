import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, COOKIE_KEYS } from "@darb-rest/config";

const PUBLIC_FILE = /\.(.*)$/;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files, api routes, and internal Next.js paths
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/restaurant-media" ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  // Check if pathname has a supported locale
  const pathnameHasLocale = SUPPORTED_LOCALES.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`,
  );

  if (pathnameHasLocale) {
    return NextResponse.next();
  }

  // Determine locale from cookie or fallback to default
  const savedLocale = request.cookies.get(COOKIE_KEYS.LOCALE)?.value;
  const locale =
    savedLocale && (SUPPORTED_LOCALES as readonly string[]).includes(savedLocale)
      ? savedLocale
      : DEFAULT_LOCALE;

  // Tenant entry keeps /<business-slug> canonical; localized routes remain shareable.
  if (/^\/[a-z0-9][a-z0-9-]*$/.test(pathname) && pathname !== "/") {
    const target = request.nextUrl.clone();
    target.pathname = `/${locale}${pathname}`;
    return NextResponse.rewrite(target);
  }

  const redirectUrl = new URL(`/${locale}${pathname === "/" ? "" : pathname}`, request.url);
  redirectUrl.search = request.nextUrl.search;
  return NextResponse.redirect(redirectUrl);
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
