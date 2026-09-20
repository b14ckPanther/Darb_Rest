import { NextResponse, type NextRequest } from "next/server";
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, COOKIE_KEYS, publicOrigin } from "@darb-rest/config";
import { domainHostname } from "@darb-rest/types";
import { isLocalDevelopmentHost } from "./lib/local-development-host";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/_next/")) return NextResponse.next();
  const raw = request.headers.get("host") ?? "";
  const local = isLocalDevelopmentHost(raw);
  let tenant: string | null = null;
  if (!local && raw !== new URL(publicOrigin()).host) {
    const hostname = domainHostname(raw);
    if (!hostname) return new NextResponse(null, { status: 404 });
    try {
      const result = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/resolve_restaurant_host`,
        {
          method: "POST",
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ p_hostname: hostname }),
          cache: "no-store",
          signal: AbortSignal.timeout(5000),
        },
      );
      if (!result.ok) return new NextResponse(null, { status: 503 });
      const resolved = await result.json();
      if (typeof resolved !== "string") return new NextResponse(null, { status: 404 });
      tenant = resolved;
    } catch {
      return new NextResponse(null, { status: 503 });
    }
  }
  const nextHeaders = new Headers(request.headers);
  nextHeaders.delete("x-darb-tenant");
  nextHeaders.delete("x-forwarded-host");
  const options = { request: { headers: nextHeaders } };
  const finish = (r: NextResponse) => {
    r.headers.set("Referrer-Policy", "no-referrer");
    r.headers.set("X-Content-Type-Options", "nosniff");
    r.headers.set("Cache-Control", "private, no-store");
    return r;
  };
  if (
    pathname.startsWith("/api/") ||
    pathname === "/restaurant-media" ||
    pathname === "/menu-image" ||
    /\.[a-z0-9]+$/i.test(pathname)
  )
    return finish(NextResponse.next(options));
  const saved = request.cookies.get(COOKIE_KEYS.LOCALE)?.value;
  const locale =
    SUPPORTED_LOCALES.find((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)) ??
    (SUPPORTED_LOCALES.includes(saved as typeof DEFAULT_LOCALE) ? saved! : DEFAULT_LOCALE);
  if (tenant && (pathname === "/" || pathname === `/${locale}`)) {
    const target = request.nextUrl.clone();
    target.pathname = `/${locale}/${tenant}`;
    return finish(NextResponse.rewrite(target, options));
  }
  if (SUPPORTED_LOCALES.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`)))
    return finish(NextResponse.next(options));
  if (/^\/[a-z0-9][a-z0-9-]*$/.test(pathname)) {
    const target = request.nextUrl.clone();
    target.pathname = `/${locale}${pathname}`;
    return finish(NextResponse.rewrite(target, options));
  }
  const target = request.nextUrl.clone();
  target.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return finish(NextResponse.redirect(target));
}
export const config = { matcher: ["/((?!_next/static|_next/image).*)"] };
