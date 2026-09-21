"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { reviewApplicationSchema } from "@darb-rest/validation";
import { requirePlatform } from "../platform";
export async function reviewApplication(form: FormData) {
  const locale = String(form.get("locale"));
  const { db } = await requirePlatform(locale);
  const parsed = reviewApplicationSchema.safeParse({
    id: form.get("id"),
    status: form.get("status"),
    internal_note: form.get("internal_note"),
    requested_plan_code: form.get("requested_plan_code"),
  });
  if (!parsed.success) redirect(`/${locale}/platform/applications?result=failed`);
  const v = parsed.data;
  // Commercial approval must snapshot terms through the dedicated approval RPC.
  if (v.status === "approved") redirect(`/${locale}/platform/applications/${v.id}?result=failed`);
  const { error } = await db.rpc("review_restaurant_application", {
    p_id: v.id,
    p_status: v.status,
    p_internal_note: v.internal_note,
    p_plan: v.requested_plan_code === "unsure" ? null : v.requested_plan_code,
  });
  revalidatePath(`/${locale}/platform/applications`, "layout");
  redirect(`/${locale}/platform/applications/${v.id}?result=${error ? "failed" : "saved"}`);
}
