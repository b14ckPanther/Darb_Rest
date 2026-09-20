import "server-only";
import { contentContext } from "./content/service";
import { canViewAnalytics, validAnalyticsRange, type AnalyticsReport } from "@darb-rest/types";
export async function loadAnalytics(filter: { from?: string; to?: string; branch?: string }) {
  const ctx = await contentContext();
  if (!ctx || !canViewAnalytics(ctx.role)) return { error: "forbidden" as const };
  const { data: business, error: zoneError } = await ctx.db
    .from("businesses")
    .select("timezone")
    .eq("id", ctx.business.id)
    .single();
  if (zoneError) return { error: "unavailable" as const };
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: business!.timezone }).format(
    new Date(),
  );
  const to = filter.to ?? today,
    from = filter.from ?? new Date(Date.parse(today) - 29 * 86400000).toISOString().slice(0, 10);
  if (
    !validAnalyticsRange(from, to) ||
    (filter.branch && !ctx.locations.some((l) => l.id === filter.branch))
  )
    return { error: "invalid" as const };
  const { data, error } = await ctx.db.rpc("restaurant_analytics", {
    p_business_id: ctx.business.id,
    p_from: from,
    p_to: to,
    ...(filter.branch ? { p_location_id: filter.branch } : {}),
  });
  if (error)
    return { error: error.code === "42501" ? ("forbidden" as const) : ("unavailable" as const) };
  return { ctx, from, to, branch: filter.branch ?? "", report: data as unknown as AnalyticsReport };
}
