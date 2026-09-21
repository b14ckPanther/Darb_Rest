"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { V1_FEATURE_FLAGS } from "@darb-rest/types";
import { requirePlatform } from "../platform";
export async function updatePlatformBusiness(form: FormData) {
  const locale = String(form.get("locale"));
  const { db } = await requirePlatform(locale);
  const id = String(form.get("business"));
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return;
  let outcome = "saved";
  try {
    if (form.get("confirm") !== "on") throw Error("confirmation_required");
    const action = form.get("action");
    if (action === "activate" || action === "suspend") {
      const result = await db
        .from("businesses")
        .update({
          status: action === "activate" ? "active" : "suspended",
          disabled_at: action === "activate" ? null : new Date().toISOString(),
        })
        .eq("id", id)
        .select("id")
        .single();
      if (result.error) throw result.error;
    } else if (action === "override") {
      const feature = String(form.get("feature")),
        raw = String(form.get("limit") ?? ""),
        limit = raw === "" ? null : Number(raw);
      const reason = String(form.get("reason") ?? "").trim();
      const expires = String(form.get("expires") ?? "");
      if (
        !V1_FEATURE_FLAGS.includes(feature as (typeof V1_FEATURE_FLAGS)[number]) ||
        (limit !== null && (!Number.isSafeInteger(limit) || limit < 0)) ||
        !reason ||
        reason.length > 500 ||
        (expires && !Number.isFinite(Date.parse(expires)))
      )
        throw Error("invalid_override");
      const result = await db.from("business_feature_overrides").upsert(
        {
          business_id: id,
          feature_key: feature,
          enabled: form.get("enabled") === "on",
          limit_value: limit,
          reason,
          expires_at: expires ? new Date(expires).toISOString() : null,
        },
        { onConflict: "business_id,feature_key" },
      );
      if (result.error) throw result.error;
    } else throw Error("invalid_action");
  } catch {
    outcome = "failed";
  }
  revalidatePath(`/${locale}/platform`, "layout");
  redirect(`/${locale}/platform/businesses/${id}?result=${outcome}`);
}
