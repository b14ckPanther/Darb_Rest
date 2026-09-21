"use server";
import { accountSession, customerAgreement, adminOrigin } from "../customer-activation";
import { getAdminClient } from "@darb-rest/supabase/admin";
import { isValidLocale } from "@darb-rest/i18n";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
export async function updateAccount(form: FormData) {
  const locale = String(form.get("locale")),
    { db, user } = await accountSession(locale);
  let result = "saved";
  const action = String(form.get("action"));
  try {
    if (action === "profile") {
      const name = String(form.get("name") ?? "").trim(),
        phone = String(form.get("phone") ?? "").trim(),
        preferred = String(form.get("preferred"));
      if (
        name.length < 1 ||
        name.length > 120 ||
        phone.length > 30 ||
        (phone && !/^\+?[0-9 ()-]{6,30}$/.test(phone)) ||
        !isValidLocale(preferred)
      )
        throw Error("invalid_profile");
      const r = await db
        .from("profiles")
        .update({ full_name: name, phone: phone || null, preferred_locale: preferred })
        .eq("id", user.id)
        .select("id")
        .single();
      if (r.error) throw Error("profile_failed");
    } else if (action === "email") {
      const email = String(form.get("email") ?? "").trim();
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        throw Error("invalid_email");
      const r = await db.auth.updateUser(
        { email },
        { emailRedirectTo: `${adminOrigin()}/${locale}/account` },
      );
      if (r.error) result = "emailConflict";
      else result = "pendingEmail";
    } else if (action === "password") {
      const password = String(form.get("password"));
      if (password.length < 12 || password.length > 128 || password !== form.get("confirmPassword"))
        throw Error("invalid_password");
      const r = await db.auth.updateUser({ password });
      if (r.error) throw Error("password_failed");
    } else throw Error("invalid_action");
  } catch {
    result = "failed";
  }
  revalidatePath(`/${locale}/account`);
  redirect(`/${locale}/account?result=${result}`);
}
export async function activateAccount(form: FormData) {
  const locale = String(form.get("locale")),
    { db, user } = await accountSession(locale);
  const record = await customerAgreement(user.id);
  if (record?.activation.activated_at) redirect(`/${locale}/onboarding`);
  let result: string;
  try {
    if (!record || !user.email_confirmed_at) throw Error("activation_missing");

    if (record.activation.invite_state !== "existing_account") {
      const password = String(form.get("password"));
      if (password.length < 12 || password.length > 128 || password !== form.get("confirmPassword"))
        throw Error("invalid_password");
      const updated = await db.auth.updateUser({ password });
      if (updated.error) throw Error("password_failed");
    }
    const r = await getAdminClient()
      .from("customer_activations")
      .update({ activated_at: new Date().toISOString() })
      .eq("agreement_id", record.agreement.id)
      .eq("user_id", user.id)
      .is("activated_at", null)
      .select("agreement_id")
      .maybeSingle();
    if (r.error || !r.data) throw Error("activation_failed");
    result = "saved";
  } catch {
    result = "failed";
  }
  redirect(
    result === "saved" ? `/${locale}/onboarding` : `/${locale}/auth/accept-invite?result=failed`,
  );
}
