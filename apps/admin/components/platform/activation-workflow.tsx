import { activationLabels, type SupportedLocale } from "@darb-rest/i18n";
import { localizedJson } from "@darb-rest/supabase/customer-mail";
import { requirePlatform, requireData } from "../../lib/platform";
import { commercialAction } from "../../lib/actions/customer-activation";
import { ActionButton } from "./commercial-approval";
export async function ActivationWorkflow({
  applicationId,
  locale,
}: {
  applicationId: string;
  locale: SupportedLocale;
}) {
  const { db } = await requirePlatform(locale),
    L = activationLabels[locale];
  const [agreementResult, mailResult] = await Promise.all([
    db.from("customer_agreements").select("*").eq("application_id", applicationId).maybeSingle(),
    db
      .from("customer_mail_outbox")
      .select("id,state,kind,created_at,sent_at,error_code")
      .eq("application_id", applicationId)
      .order("created_at"),
  ]);
  const a = requireData(agreementResult),
    mail = requireData(mailResult) ?? [];
  const [paymentResult, activationResult, subscriptionResult] = a
    ? await Promise.all([
        db
          .from("manual_customer_payments")
          .select("*")
          .eq("agreement_id", a.id)
          .order("created_at"),
        db.from("customer_activations").select("*").eq("agreement_id", a.id).single(),
        db.from("customer_subscriptions").select("*").eq("agreement_id", a.id).maybeSingle(),
      ])
    : [null, null, null];
  const payments = paymentResult ? requireData(paymentResult) : [],
    activation = activationResult ? requireData(activationResult) : null,
    subscription = subscriptionResult ? requireData(subscriptionResult) : null;
  const recordIds = [
    ...(a ? [a.id] : []),
    ...(payments ?? []).map((p) => p.id),
    ...mail.map((m) => m.id),
    ...(subscription ? [subscription.id] : []),
  ];
  const history = recordIds.length
    ? (requireData(
        await db
          .from("customer_commercial_audit")
          .select("id,record_table,actor_id,occurred_at")
          .in("record_id", recordIds)
          .order("occurred_at", { ascending: false })
          .limit(20),
      ) ?? [])
    : [];
  const actors = [...new Set(history.flatMap((h) => (h.actor_id ? [h.actor_id] : [])))];
  const people = actors.length
    ? (requireData(await db.from("profiles").select("id,full_name").in("id", actors)) ?? [])
    : [];
  const hidden = (action: string) => (
    <>
      <input type="hidden" name="id" value={applicationId} />
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="action" value={action} />
    </>
  );
  const money = (value: number) =>
    new Intl.NumberFormat(locale, { style: "currency", currency: "ILS" }).format(value);
  const date = (value: string | null) => (value ? new Date(value).toLocaleString(locale) : "—");
  const state = (value: string) => L[value as keyof typeof L] ?? L.pending;
  return (
    <section className="grid gap-6">
      <h2 className="text-2xl font-bold">{L.customer}</h2>
      {a && (
        <>
          <ol className="grid gap-3 sm:grid-cols-5">
            {[
              L.agreement,
              payments?.some((p) => p.status === "confirmed") ? L.confirmed : L.awaiting,
              activation ? state(activation.invite_state) : L.not_sent,
              activation?.activated_at ? L.activated : L.accountStage,
              activation?.business_id ? L.active : L.onboarding,
            ].map((label, index) => (
              <li
                key={index}
                className="rounded-lg bg-[var(--warm-bone)] p-4 text-sm font-semibold"
              >
                {label}
              </li>
            ))}
          </ol>
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="grid gap-3 rounded-xl border p-5">
              <h3 className="text-xl font-bold">{L.agreement}</h3>
              <p>
                {localizedJson(a.plan_name, locale)} · {state(a.billing_cycle)}
              </p>
              <p className="text-2xl font-bold">{money(a.agreed_amount_ils)}</p>
              <p>
                {L.reference}: <b dir="ltr">{a.payment_reference}</b>
              </p>
              <p>
                {L.approvedBy} · {date(a.approved_at)}
              </p>
              <p>
                {L.dueDate}: {date(a.payment_due_at)}
              </p>
            </section>
            <section className="grid gap-4 rounded-xl border p-5">
              <h3 className="text-xl font-bold">{L.payment}</h3>
              <p className="text-sm">{L.manual}</p>
              {payments?.map((p) => (
                <div key={p.id} className="grid gap-3">
                  <p>
                    {state(p.status)} · {money(p.paid_amount_ils ?? p.expected_amount_ils)}{" "}
                    {p.method ? state(p.method) : ""}
                  </p>
                  {p.confirmed_at && <p>{date(p.confirmed_at)}</p>}
                  {p.status === "pending" && p.purpose === "initial" && (
                    <form action={commercialAction} className="grid gap-3">
                      {hidden("confirm")}
                      <label className="grid gap-2">
                        {L.paid}
                        <input
                          required
                          type="number"
                          name="amount"
                          min={p.expected_amount_ils}
                          step="0.01"
                          defaultValue={p.expected_amount_ils}
                          className="min-h-12 rounded-lg border px-3"
                        />
                      </label>
                      <label className="grid gap-2">
                        {L.method}
                        <select name="method" className="min-h-12 rounded-lg border px-3">
                          <option value="bit">{L.bit}</option>
                          <option value="bank_transfer">{L.bank_transfer}</option>
                        </select>
                      </label>
                      <label className="grid gap-2">
                        {L.external}
                        <input
                          name="external"
                          maxLength={200}
                          className="min-h-12 rounded-lg border px-3"
                        />
                      </label>
                      <label className="grid gap-2">
                        {L.note}
                        <textarea name="note" maxLength={2000} className="rounded-lg border p-3" />
                      </label>
                      <label className="flex min-h-11 items-center gap-3">
                        <input type="checkbox" name="confirmed" required />
                        {L.explicit}
                      </label>
                      <ActionButton label={L.confirm} />
                    </form>
                  )}
                </div>
              ))}
            </section>
          </div>
          <section className="grid gap-3 rounded-xl border p-5">
            <h3 className="text-xl font-bold">{L.accountStage}</h3>
            <p>{activation ? state(activation.invite_state) : L.not_sent}</p>
            <p>{date(activation?.invite_sent_at ?? null)}</p>
            {activation?.activated_at && (
              <p>
                {L.activated} · {date(activation.activated_at)}
              </p>
            )}
            {activation?.invite_state === "existing_account" && <p>{L.existing}</p>}
            {payments?.some((p) => p.status === "confirmed") &&
              activation &&
              !activation.activated_at &&
              ["not_sent", "failed", "sent"].includes(activation.invite_state) && (
                <form action={commercialAction}>
                  {hidden("invite")}
                  <ActionButton label={L.invite} />
                </form>
              )}
          </section>
          {subscription && (
            <section className="grid gap-3 rounded-xl border p-5">
              <h3 className="text-xl font-bold">{L.subscription}</h3>
              <p>
                {state(subscription.status)} · {money(subscription.agreed_amount_ils)}
              </p>
              <p>
                {L.periodStart}: {date(subscription.current_period_start)}
              </p>
              <p>
                {L.periodEnd}: {date(subscription.current_period_end)}
              </p>
              <p>{L.renewal}</p>
            </section>
          )}
        </>
      )}
      {history.length > 0 && (
        <details className="rounded-xl border p-5">
          <summary className="min-h-11 cursor-pointer font-bold">{L.audit}</summary>
          <ol className="grid gap-3">
            {history.map((h) => (
              <li key={h.id} className="flex flex-wrap justify-between gap-2 border-t py-3 text-sm">
                <span>
                  {h.record_table === "customer_agreements"
                    ? L.agreement
                    : h.record_table === "manual_customer_payments"
                      ? L.payment
                      : h.record_table === "customer_subscriptions"
                        ? L.subscription
                        : h.record_table === "customer_mail_outbox"
                          ? L.emailState
                          : L.accountStage}
                </span>
                <span>
                  {people.find((p) => p.id === h.actor_id)?.full_name || "Darb REST"} ·{" "}
                  {date(h.occurred_at)}
                </span>
              </li>
            ))}
          </ol>
        </details>
      )}
      <section className="grid gap-3 rounded-xl border p-5">
        <h3 className="text-xl font-bold">{L.emailState}</h3>
        {mail.map((m) => (
          <div
            key={m.id}
            className="flex flex-wrap items-center justify-between gap-3 border-b py-3"
          >
            <div>
              <p>
                {m.kind === "approval"
                  ? L.instructions
                  : m.kind === "received"
                    ? L.received
                    : m.kind === "rejection"
                      ? L.rejected
                      : L.invite}
              </p>
              <p className="text-sm">
                {m.state === "failed" ? L.failedState : state(m.state)} ·{" "}
                {date(m.sent_at ?? m.created_at)}
              </p>
            </div>
            {["queued", "failed"].includes(m.state) && (
              <form action={commercialAction}>
                {hidden("mail")}
                <input type="hidden" name="mail" value={m.id} />
                <ActionButton label={L.resend} />
              </form>
            )}
          </div>
        ))}
      </section>
    </section>
  );
}
