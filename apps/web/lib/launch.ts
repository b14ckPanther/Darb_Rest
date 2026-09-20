import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { getAdminClient } from "@darb-rest/supabase/admin";
import { publicOrigin, validateProduction } from "@darb-rest/config";
import { domainHostname } from "@darb-rest/types";
import { createHmac } from "node:crypto";
import { isIP } from "node:net";
/** Host is accepted only from the ingress Host header, never forwarded-host or query parameters. */
export const requestTenant = cache(async () => {
  const raw = (await headers()).get("host") ?? "";
  const primary = new URL(publicOrigin()).host;
  if (
    raw === primary ||
    (process.env.NODE_ENV !== "production" && /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(raw))
  )
    return null;
  const host = domainHostname(raw);
  if (!host) throw Error("unknown_host");
  const { data, error } = await getAdminClient().rpc("resolve_restaurant_host", {
    p_hostname: host,
  });
  if (error || !data) throw Error("unknown_host");
  return data;
});
export async function assertPublicBusiness(slug: string) {
  const bound = await requestTenant();
  if (bound && bound !== slug) return false;
  const db = getAdminClient();
  const { data: b, error: e } = await db
    .from("businesses")
    .select("id")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();
  if (e) throw e;
  if (!b) return false;
  const { data, error } = await db
    .from("restaurant_launch")
    .select("is_public")
    .eq("business_id", b.id)
    .maybeSingle();
  // Existing local tests may run before the operator applies the launch migration. Production fails closed.
  if (error) {
    if (process.env.NODE_ENV !== "production" && ["42P01", "PGRST205"].includes(error.code))
      return true;
    throw error;
  }
  return data?.is_public === true;
}
export async function publicMutationBudget() {
  if (process.env.NODE_ENV !== "production") return;
  validateProduction();
  const h = await headers();
  const ip = h.get(process.env.TRUSTED_CLIENT_IP_HEADER!)?.trim();
  if (!ip || !isIP(ip)) throw Error("client_address_unavailable");
  const key = createHmac("sha256", process.env.PUBLIC_RATE_LIMIT_SECRET!).update(ip).digest("hex");
  const { data, error } = await getAdminClient().rpc("consume_public_budget", { p_key: key });
  if (error || !data) throw Error("request_budget_exceeded");
}
export async function canonicalOrigin(businessId: string) {
  const { data, error } = await getAdminClient()
    .from("business_domains")
    .select("hostname")
    .eq("business_id", businessId)
    .eq("active", true)
    .eq("canonical", true)
    .gt("verified_until", new Date().toISOString())
    .maybeSingle();
  if (
    error &&
    !(process.env.NODE_ENV !== "production" && ["42P01", "PGRST205"].includes(error.code))
  )
    throw error;
  return data
    ? { origin: `https://${data.hostname}`, custom: true }
    : { origin: publicOrigin(), custom: false };
}
