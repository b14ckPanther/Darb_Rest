const v1Dormant = () => true;
import { NextRequest } from "next/server";
import { loadAnalytics } from "../../../lib/analytics";
import { csvCell } from "@darb-rest/types";
import { getDictionary, isValidLocale } from "@darb-rest/i18n";
export async function GET(request: NextRequest) {
  if (v1Dormant()) return new Response(null, { status: 404 });
  const q = request.nextUrl.searchParams;
  const locale = q.get("locale") ?? "en";
  if (!isValidLocale(locale)) return new Response(null, { status: 400 });
  const result = await loadAnalytics({
    from: q.get("from") ?? undefined,
    to: q.get("to") ?? undefined,
    branch: q.get("branch") ?? undefined,
  });
  const headers = { "Cache-Control": "private, no-store" };
  if (result.error)
    return Response.json(
      { error: result.error },
      {
        status: result.error === "forbidden" ? 403 : result.error === "invalid" ? 400 : 503,
        headers,
      },
    );
  const L = getDictionary(locale).analytics;
  const rows = [
    [L.period, L.timezone, L.orders, L.value, L.paid],
    ...result.report.rows
      .filter((r) => r.kind === "daily")
      .map((r) => [
        r.key,
        result.report.timezone,
        r.orders,
        `${r.currency} ${(r.value_cents / 100).toFixed(2)}`,
        `${r.currency} ${(r.paid_cents / 100).toFixed(2)}`,
      ]),
  ];
  return new Response("\ufeff" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n"), {
    headers: {
      ...headers,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="analytics.csv"',
      "X-Content-Type-Options": "nosniff",
    },
  });
}
