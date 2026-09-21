const v1Dormant = () => true;
import QRCode from "qrcode";
import { contentContext } from "../../../../../lib/content/service";
import { qrUrl } from "../../../../../lib/tables/service";
import { canManageTables } from "@darb-rest/types";
import { isValidLocale } from "@darb-rest/i18n";
export const runtime = "nodejs";
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (v1Dormant()) return new Response(null, { status: 404 });
  const { id } = await params;
  const query = new URL(request.url).searchParams,
    locale = query.get("locale") ?? "en";
  if (!/^[a-f0-9-]{36}$/.test(id) || !isValidLocale(locale))
    return new Response(null, { status: 400 });
  const ctx = await contentContext();
  if (!ctx || !canManageTables(ctx.role)) return new Response(null, { status: 403 });
  const [table, token] = await Promise.all([
    ctx.db
      .from("restaurant_tables")
      .select("id")
      .eq("id", id)
      .eq("business_id", ctx.business.id)
      .eq("is_active", true)
      .is("archived_at", null)
      .maybeSingle(),
    ctx.db
      .from("table_qr_tokens")
      .select("token")
      .eq("table_id", id)
      .eq("business_id", ctx.business.id)
      .maybeSingle(),
  ]);
  if (table.error || token.error) return new Response(null, { status: 503 });
  if (!table.data || !token.data) return new Response(null, { status: 404 });
  const url = qrUrl(locale, token.data.token),
    png = query.get("format") === "png";
  const body = png
    ? new Uint8Array(
        await QRCode.toBuffer(url, { errorCorrectionLevel: "Q", margin: 4, width: 1200 }),
      )
    : await QRCode.toString(url, { type: "svg", errorCorrectionLevel: "Q", margin: 4 });
  return new Response(body, {
    headers: {
      "Content-Type": png ? "image/png" : "image/svg+xml",
      "Content-Disposition": `attachment; filename="table-qr.${png ? "png" : "svg"}"`,
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
