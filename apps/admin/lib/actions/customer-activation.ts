"use server";
import { getAdminClient } from "@darb-rest/supabase/admin";
import { deliverCustomerMail } from "@darb-rest/supabase/customer-mail";
import { requirePlatform } from "../platform";
import { adminOrigin } from "../customer-activation";
import { buildCustomerMessage } from "../customer-messages";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
const uuid = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export async function commercialAction(form: FormData) {
  const locale = String(form.get("locale")),
    id = String(form.get("id")),
    action = String(form.get("action"));
  const { db, user } = await requirePlatform(locale);
  if (!uuid(id)) throw Error("invalid_application");
  const service = getAdminClient();
  let result = "saved";
  try {
    if (action === "approve") {
      const plan = String(form.get("plan")),
        cycle = String(form.get("cycle")),
        amount = String(form.get("amount") ?? "");
      if (
        !uuid(plan) ||
        !["monthly", "yearly"].includes(cycle) ||
        !/^\d+(\.\d{1,2})?$/.test(amount)
      )
        throw Error("invalid_agreement");
      const r = await db.rpc("approve_customer_application", {
        p_application: id,
        p_plan: plan,
        p_cycle: cycle,
        p_amount: Number(amount),
        p_confirm_starting: form.get("confirmed") === "on",
      });
      if (r.error) throw Error("approval_failed");
      const { data: mail } = await service
        .from("customer_mail_outbox")
        .select("id")
        .eq("agreement_id", r.data)
        .eq("kind", "approval")
        .single();
      if (mail) {
        const delivery = await deliverCustomerMail(mail.id, buildCustomerMessage);
        if (delivery !== "sent") result = delivery;
      }
    } else if (action === "confirm") {
      if (form.get("confirmed") !== "on") throw Error("confirmation_required");
      const { data: p } = await service
        .from("customer_agreements")
        .select("id")
        .eq("application_id", id)
        .single();
      const { data: payment } = await service
        .from("manual_customer_payments")
        .select("id")
        .eq("agreement_id", p?.id ?? "")
        .eq("purpose", "initial")
        .eq("status", "pending")
        .single();
      if (!payment) throw Error("payment_missing");
      const amount = String(form.get("amount"));
      if (!/^\d+(\.\d{1,2})?$/.test(amount)) throw Error("invalid_amount");
      const r = await db.rpc("confirm_customer_payment", {
        p_payment: payment.id,
        p_amount: Number(amount),
        p_method: String(form.get("method")),
        p_external_reference: String(form.get("external") ?? ""),
        p_note: String(form.get("note") ?? ""),
      });
      if (r.error) throw Error("confirmation_failed");
    } else if (action === "mail") {
      const mailId = String(form.get("mail"));
      if (!uuid(mailId)) throw Error("invalid_mail");
      const { data: mail } = await service
        .from("customer_mail_outbox")
        .select("id")
        .eq("id", mailId)
        .eq("application_id", id)
        .single();
      if (!mail) throw Error("mail_missing");
      result = await deliverCustomerMail(mail.id, buildCustomerMessage);
    } else if (action === "reject") {
      const safe = String(form.get("safeMessage") ?? ""),
        note = String(form.get("note") ?? "");
      if (safe.length > 1000 || note.length > 2000) throw Error("invalid_note");
      const { data: a } = await service
        .from("customer_agreements")
        .select("id")
        .eq("application_id", id)
        .maybeSingle();
      if (a) throw Error("already_agreed");
      const { data: rejected, error } = await service
        .from("restaurant_applications")
        .update({
          status: "rejected",
          customer_safe_message: safe,
          internal_note: note,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();
      if (error || !rejected) throw Error("rejection_failed");
      const { data: mail } = await service
        .from("customer_mail_outbox")
        .upsert(
          { application_id: id, kind: "rejection", deduplication_key: `rejection:${id}` },
          { onConflict: "deduplication_key", ignoreDuplicates: true },
        )
        .select("id")
        .maybeSingle();
      if (mail) result = await deliverCustomerMail(mail.id, buildCustomerMessage);
    } else if (action === "invite") {
      const { data: a } = await service
        .from("customer_agreements")
        .select("id,customer_email,customer_name,locale")
        .eq("application_id", id)
        .single();
      if (!a) throw Error("agreement_missing");
      const { data: p } = await service
        .from("manual_customer_payments")
        .select("id")
        .eq("agreement_id", a.id)
        .eq("purpose", "initial")
        .eq("status", "confirmed")
        .single();
      if (!p) throw Error("payment_required");
      const { data: activation } = await service
        .from("customer_activations")
        .select("*")
        .eq("agreement_id", a.id)
        .single();
      if (
        !activation ||
        activation.activated_at ||
        !["not_sent", "failed", "sent"].includes(activation.invite_state)
      )
        throw Error("invite_not_retryable");
      if (
        activation.invite_claimed_at &&
        Date.now() - Date.parse(activation.invite_claimed_at) < 60000
      )
        throw Error("invite_cooldown");
      const claim = crypto.randomUUID();
      const { data: claimed, error: claimError } = await service
        .from("customer_activations")
        .update({
          invite_state: "sending",
          invite_attempt_id: claim,
          invite_attempts: activation.invite_attempts + 1,
          invite_claimed_at: new Date().toISOString(),
          invite_error_code: null,
        })
        .eq("agreement_id", a.id)
        .eq("invite_state", activation.invite_state)
        .eq("invite_attempts", activation.invite_attempts)
        .select("agreement_id")
        .maybeSingle();
      if (claimError || !claimed) throw Error("invite_claim_failed");
      // Auth's verified email is checked before initial association; subsequent identity is UUID-only.
      let existing: { id: string; email_confirmed_at?: string } | undefined;
      let lookupComplete = false;
      for (let page = 1; page <= 100; page++) {
        const users = await service.auth.admin.listUsers({ page, perPage: 100 });
        if (users.error) break;
        existing = users.data.users.find((u) => u.email?.toLowerCase() === a.customer_email);
        if (existing || users.data.users.length < 100) {
          lookupComplete = true;
          break;
        }
      }
      if (!lookupComplete) {
        await service
          .from("customer_activations")
          .update({ invite_state: "failed", invite_error_code: "auth_lookup_failed" })
          .eq("agreement_id", a.id)
          .eq("invite_attempt_id", claim);
        throw Error("auth_lookup_failed");
      }
      if (
        existing?.email_confirmed_at &&
        activation.user_id === existing.id &&
        activation.invite_sent_at
      ) {
        // An invited user may verify the link before choosing a password. A resend must
        // preserve password setup, not relabel that account as an established customer.
        try {
          const recovery = await service.auth.resetPasswordForEmail(a.customer_email, {
            redirectTo: `${adminOrigin()}/${a.locale}/auth/accept-invite`,
          });
          const state = recovery.error ? "unknown" : "sent";
          const saved = await service
            .from("customer_activations")
            .update({
              invite_state: state,
              invite_sent_at: recovery.error ? activation.invite_sent_at : new Date().toISOString(),
              invite_error_code: recovery.error ? "auth_resend_uncertain" : null,
            })
            .eq("agreement_id", a.id)
            .eq("invite_attempt_id", claim);
          if (recovery.error || saved.error) result = "unknown";
        } catch {
          await service
            .from("customer_activations")
            .update({ invite_state: "unknown", invite_error_code: "auth_resend_uncertain" })
            .eq("agreement_id", a.id)
            .eq("invite_attempt_id", claim);
          result = "unknown";
        }
      } else if (existing?.email_confirmed_at) {
        const saved = await service
          .from("customer_activations")
          .update({
            user_id: existing.id,
            invite_state: "existing_account",
            invite_error_code: null,
          })
          .eq("agreement_id", a.id)
          .eq("invite_attempt_id", claim);
        if (saved.error) throw Error("association_failed");
        const { data: mail } = await service
          .from("customer_mail_outbox")
          .upsert(
            {
              application_id: id,
              agreement_id: a.id,
              kind: "invitation",
              deduplication_key: `existing-invitation:${a.id}`,
            },
            { onConflict: "deduplication_key", ignoreDuplicates: true },
          )
          .select("id")
          .maybeSingle();
        if (mail) result = await deliverCustomerMail(mail.id, buildCustomerMessage);
      } else {
        try {
          const invited = await service.auth.admin.inviteUserByEmail(a.customer_email, {
            data: { full_name: a.customer_name, preferred_locale: a.locale },
            redirectTo: `${adminOrigin()}/${a.locale}/auth/accept-invite`,
          });
          if (invited.error || !invited.data.user) {
            await service
              .from("customer_activations")
              .update({
                invite_state:
                  invited.error && invited.error.status && invited.error.status < 500
                    ? "failed"
                    : "unknown",
                invite_error_code: "auth_invite_failed",
              })
              .eq("agreement_id", a.id)
              .eq("invite_attempt_id", claim);
            result = "failed";
          } else {
            const saved = await service
              .from("customer_activations")
              .update({
                user_id: invited.data.user.id,
                invite_state: "sent",
                invite_sent_at: new Date().toISOString(),
                invite_error_code: null,
              })
              .eq("agreement_id", a.id)
              .eq("invite_attempt_id", claim);
            if (saved.error) result = "unknown";
          }
        } catch {
          await service
            .from("customer_activations")
            .update({ invite_state: "unknown", invite_error_code: "auth_invite_uncertain" })
            .eq("agreement_id", a.id)
            .eq("invite_attempt_id", claim);
          result = "unknown";
        }
      }
    } else throw Error("invalid_action");
  } catch {
    result = "failed";
  }
  revalidatePath(`/${locale}/platform/applications`, "layout");
  redirect(`/${locale}/platform/applications/${id}?result=${result}`);
}
export async function saveBillingSettings(form: FormData) {
  const locale = String(form.get("locale"));
  await requirePlatform(locale);
  let result = "saved";
  const text = (name: string, max = 200) => {
    const v = String(form.get(name) ?? "").trim();
    if (v.length > max) throw Error("invalid_value");
    return v;
  };
  try {
    const email = text("support_email");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Error("invalid_email");
    const due = Number(form.get("payment_due_days"));
    if (!Number.isInteger(due) || due < 1 || due > 365) throw Error("invalid_due");
    const instructions = (prefix: string) =>
      Object.fromEntries(["en", "ar", "he"].map((l) => [l, text(`${prefix}_${l}`, 2000)]));
    const saved = await getAdminClient()
      .from("platform_billing_settings")
      .update({
        bit_enabled: form.get("bit_enabled") === "on",
        bit_phone: text("bit_phone", 20),
        bank_enabled: form.get("bank_enabled") === "on",
        bank_account_holder: text("bank_account_holder"),
        bank_name: text("bank_name"),
        bank_number: text("bank_number"),
        bank_branch: text("bank_branch"),
        bank_account_number: text("bank_account_number"),
        bank_iban: text("bank_iban"),
        support_email: email || null,
        sender_name: text("sender_name", 120),
        payment_due_days: due,
        bit_instructions: instructions("bit"),
        bank_instructions: instructions("bank"),
      })
      .eq("id", true);
    if (saved.error) throw Error("save_failed");
  } catch {
    result = "failed";
  }
  revalidatePath(`/${locale}/platform/billing`);
  redirect(`/${locale}/platform/billing?result=${result}`);
}
