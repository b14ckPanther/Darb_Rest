import { getAdminClient } from "./admin";
import { mailDocument, localizedJson, type OutboxRow } from "./customer-mail";
import { activationLabels } from "@darb-rest/i18n/activation";
import type { SupportedLocale } from "@darb-rest/types";
export async function buildCustomerMessage(row: OutboxRow) {
  const db = getAdminClient();
  const { data: app, error } = await db
    .from("restaurant_applications")
    .select("email,business_name,locale,customer_safe_message,requested_plan_code")
    .eq("id", row.application_id)
    .single();
  if (error) throw Error("application_missing");
  const locale = app.locale as SupportedLocale,
    L = activationLabels[locale];
  const { data: settings, error: settingsError } = await db
    .from("platform_billing_settings")
    .select("*")
    .eq("id", true)
    .single();
  if (settingsError) throw Error("billing_missing");
  let subject = L.received;
  const lines = [app.business_name ?? ""];
  if (row.kind === "approval") {
    if (!row.agreement_id) throw Error("agreement_missing");
    const { data: a, error: err } = await db
      .from("customer_agreements")
      .select("*")
      .eq("id", row.agreement_id)
      .single();
    if (err) throw Error("agreement_missing");
    subject = L.instructions;
    lines.push(
      `${L.plan}: ${localizedJson(a.plan_name, locale)}`,
      `${L.cycle}: ${L[a.billing_cycle as "monthly" | "yearly"]}`,
      `${L.amount}: ${new Intl.NumberFormat(locale, { style: "currency", currency: "ILS" }).format(a.agreed_amount_ils)}`,
      `${L.reference}: ${a.payment_reference}`,
      `${L.dueDate}: ${new Date(a.payment_due_at).toLocaleDateString(locale)}`,
    );
    if (settings.bit_enabled)
      lines.push(
        `${L.bit}: ${settings.bit_phone}`,
        localizedJson(settings.bit_instructions, locale),
      );
    if (settings.bank_enabled)
      lines.push(
        `${L.bank_transfer}\n${L.holder}: ${settings.bank_account_holder}\n${L.bankName}: ${settings.bank_name}\n${L.bankNumber}: ${settings.bank_number}\n${L.branch}: ${settings.bank_branch}\n${L.bankAccount}: ${settings.bank_account_number}\n${settings.bank_iban}`,
        localizedJson(settings.bank_instructions, locale),
      );
    if (!settings.bit_enabled && !settings.bank_enabled) lines.push(L.noMethods);
    lines.push(L.next);
  } else if (row.kind === "rejection") {
    subject = L.rejected;
    lines.push(app.customer_safe_message || L.rejection);
  } else if (row.kind === "received") {
    if (app.requested_plan_code) {
      const { data: plan, error: planError } = await db
        .from("plans")
        .select("name")
        .eq("code", app.requested_plan_code)
        .maybeSingle();
      if (planError) throw Error("plan_lookup_failed");
      if (plan) lines.push(`${L.plan}: ${localizedJson(plan.name, locale)}`);
    }
    lines.push(L.review);
  } else if (row.kind === "invitation") {
    const origin = new URL(process.env.NEXT_PUBLIC_ADMIN_URL || "http://localhost:3001");
    if (process.env.NODE_ENV === "production" && origin.protocol !== "https:")
      throw Error("invalid_admin_origin");
    subject = L.activate;
    lines.push(L.existing, `${origin.origin}/${locale}/auth/signin?next=activation`);
  } else throw Error("invalid_mail_kind");
  if (settings.support_email) lines.push(settings.support_email);
  lines.push(L.privacy);
  return {
    to: app.email,
    senderName: settings.sender_name,
    ...mailDocument(locale, subject, lines),
    replyTo: settings.support_email ?? undefined,
  };
}
