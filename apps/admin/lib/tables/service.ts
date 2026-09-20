import "server-only";
import { contentContext } from "../content/service";
import { canManageTables, tableQrUrl } from "@darb-rest/types";
import { PRODUCTION_DOMAIN } from "@darb-rest/config";
export async function loadTables(locationId?: string) {
  const ctx = await contentContext();
  if (!ctx) return null;
  const location = ctx.locations.find((l) => l.id === locationId) ?? ctx.locations[0];
  if (!location) return null;
  const rows = [];
  for (let offset = 0; offset < 1000; offset += 100) {
    const { data, error, count } = await ctx.db
      .from("restaurant_tables")
      .select("*", { count: "exact" })
      .eq("business_id", ctx.business.id)
      .eq("location_id", location.id)
      .is("archived_at", null)
      .order("created_at")
      .order("id")
      .range(offset, offset + 99);
    if (error) throw error;
    if ((count ?? 0) > 1000) throw Error("Table limit exceeded");
    rows.push(...data);
    if (data.length < 100) break;
  }
  const tokenResult = canManageTables(ctx.role)
    ? await ctx.db
        .from("table_qr_tokens")
        .select("table_id,token")
        .eq("business_id", ctx.business.id)
        .eq("location_id", location.id)
    : { data: [], error: null };
  if (tokenResult.error) throw tokenResult.error;
  return {
    ...ctx,
    location,
    tables: rows,
    tokens: Object.fromEntries((tokenResult.data ?? []).map((t) => [t.table_id, t.token])),
  };
}
export function qrUrl(locale: string, token: string) {
  const origin =
    process.env.NEXT_PUBLIC_WEB_URL ||
    (process.env.NODE_ENV === "development"
      ? "http://localhost:3000"
      : `https://${PRODUCTION_DOMAIN}`);
  return tableQrUrl(origin, locale, token);
}
