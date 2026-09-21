"use server";
import { Resolver } from "node:dns/promises";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminClient } from "@darb-rest/supabase/admin";
import { domainHostname, canManageBranding } from "@darb-rest/types";
import { publicOrigin } from "@darb-rest/config";
import { isValidLocale } from "@darb-rest/i18n";
import { contentContext } from "../content/service";
export async function manageLaunch(form: FormData): Promise<void> {
  const locale = String(form.get("locale"));
  if (!isValidLocale(locale)) return;
  let result = "saved";
  try {
    const ctx = await contentContext();
    if (!ctx || !canManageBranding(ctx.role) || form.get("business") !== ctx.business.id)
      throw Error("forbidden");
    const action = String(form.get("action"));
    if (action !== "publish" && action !== "unpublish") throw Error("dormant_capability");
    if (action === "publish" || action === "unpublish") {
      const { error } = await ctx.db.rpc("set_restaurant_launch", {
        p_business_id: ctx.business.id,
        p_public: action === "publish",
      });
      if (error) throw error;
    } else {
      const host = domainHostname(String(form.get("hostname")));
      if (!host || host === new URL(publicOrigin()).hostname) throw Error("invalid_host");
      if (action === "verify") {
        const { data, error } = await ctx.db
          .from("business_domains")
          .select("id,verification_token")
          .eq("business_id", ctx.business.id)
          .eq("hostname", host)
          .single();
        if (error || !data) throw Error("forbidden");
        const resolver = new Resolver({ timeout: 3000, tries: 1 });
        const txt = await resolver.resolveTxt(`_darb-verification.${host}`);
        if (!txt.some((v) => v.join("") === `darb-rest=${data.verification_token}`))
          throw Error("unverified");
        const verified = await getAdminClient().rpc("verify_business_domain", {
          p_id: data.id,
          p_token: data.verification_token,
        });
        if (verified.error || !verified.data) throw Error("unverified");
      } else {
        if (!["register", "activate", "canonical", "deactivate", "remove"].includes(action))
          throw Error("invalid_action");
        if (["activate", "canonical"].includes(action) && form.get("tls") !== "ready")
          throw Error("tls_required");
        const { error } = await ctx.db.rpc("manage_business_domain", {
          p_business_id: ctx.business.id,
          p_hostname: host,
          p_action: action,
        });
        if (error) throw error;
      }
    }
  } catch {
    result = "failed";
  }
  revalidatePath(`/${locale}/launch`);
  redirect(`/${locale}/launch?result=${result}`);
}
