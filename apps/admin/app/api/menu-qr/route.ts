import QRCode from "qrcode";
import { contentContext } from "../../../lib/content/service";
import { resolveTenantContext } from "../../../lib/tenant-resolver";
import { publicOrigin } from "@darb-rest/config";
import { isValidLocale } from "@darb-rest/i18n";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const locale = query.get("locale") ?? "en";
  if (!isValidLocale(locale)) return new Response(null, { status: 400 });
  const [ctx, tenant] = await Promise.all([contentContext(), resolveTenantContext()]);
  if (!ctx || !tenant?.entitlements.qr_codes.enabled) return new Response(null, { status: 403 });
  const location = ctx.locations.find((l) => l.id === query.get("location"));
  if (!location) return new Response(null, { status: 404 });
  if (
    !tenant.entitlements.multi_location.enabled &&
    tenant.availableLocations.find((l) => l.isPrimary)?.id !== location.id
  )
    return new Response(null, { status: 403 });
  const target = new URL(`/${locale}/${ctx.business.slug}`, publicOrigin());
  target.searchParams.set("branch", location.slug);
  const body = await QRCode.toString(target.toString(), {
    type: "svg",
    errorCorrectionLevel: "Q",
    margin: 4,
  });
  return new Response(body, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Content-Disposition": 'attachment; filename="menu-qr.svg"',
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
