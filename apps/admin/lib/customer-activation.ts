import "server-only";
import { getAdminClient } from "@darb-rest/supabase/admin";
import { getServerClient } from "@darb-rest/supabase/server";
import { redirect } from "next/navigation";
import { isValidLocale } from "@darb-rest/i18n";

export async function accountSession(locale: string) {
  if (!isValidLocale(locale)) throw Error("invalid_locale");
  const db = await getServerClient();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (error || !user) redirect(`/${locale}/auth/signin`);
  return { db, user };
}
export function adminOrigin() {
  const url = new URL(process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3001");
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:")
    throw Error("invalid_admin_origin");
  return url.origin;
}
/** Identity is always the verified Auth UUID; never use the mutable login email here. */
export async function customerAgreement(userId: string, includeCompleted = false) {
  const db = getAdminClient();
  let query = db.from("customer_activations").select("*").eq("user_id", userId);
  if (!includeCompleted) query = query.is("business_id", null);
  const { data: activation, error } = await query
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw Error("activation_lookup_failed");
  if (!activation) return null;
  const { data: agreement, error: agreementError } = await db
    .from("customer_agreements")
    .select("*")
    .eq("id", activation.agreement_id)
    .single();
  if (agreementError) throw Error("agreement_lookup_failed");
  return { activation, agreement };
}
