import { getServerClient } from "./server";
import type { PublicCommercialPlan } from "@darb-rest/types";
/** Request-time database read. No price fallback, build snapshot or cross-request cache. */
export async function getCommercialPlans(): Promise<PublicCommercialPlan[]> {
  const db = await getServerClient({
    fetch: (url, init) => fetch(url, { ...init, cache: "no-store" }),
  });
  const { data, error } = await db.rpc("public_commercial_plans");
  if (error) return []; // Explicit unavailable UI; never substitute commercial prices.
  return (data ?? []) as unknown as PublicCommercialPlan[];
}
