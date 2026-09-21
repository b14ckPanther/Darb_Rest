import { getAdminClient } from "./admin";
import type { Database, Json } from "./types";

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
  replyTo?: string;
  senderName?: string;
};
export interface TransactionalProvider {
  send(
    message: MailMessage,
    key: string,
  ): Promise<{ state: "sent" | "failed" | "unknown"; reference?: string }>;
}
/** A server-only provider bridge. The configured endpoint must implement idempotency by key. */
export function transactionalProvider(): TransactionalProvider | null {
  const kind = process.env.TRANSACTIONAL_EMAIL_PROVIDER;
  if (kind && !["http", "resend"].includes(kind)) return null;
  const endpoint =
    kind === "resend" ? "https://api.resend.com/emails" : process.env.TRANSACTIONAL_EMAIL_ENDPOINT;
  const token =
    kind === "resend" ? process.env.RESEND_API_KEY : process.env.TRANSACTIONAL_EMAIL_TOKEN;
  const from = process.env.TRANSACTIONAL_EMAIL_FROM;
  if (!endpoint || !token || !from) return null;
  const url = new URL(endpoint);
  if (
    url.protocol !== "https:" &&
    !(process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1"].includes(url.hostname))
  )
    throw Error("invalid_mail_endpoint");
  return {
    async send(message, key) {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            "Idempotency-Key": key,
          },
          body: JSON.stringify(
            kind === "resend"
              ? {
                  from: message.senderName
                    ? `${message.senderName.replace(/[<>\r\n"]/g, "")} <${from}>`
                    : from,
                  to: [message.to],
                  subject: message.subject,
                  text: message.text,
                  html: message.html,
                  reply_to: message.replyTo,
                }
              : { from, ...message },
          ),
          signal: AbortSignal.timeout(15000),
          cache: "no-store",
        });
        if (response.ok) {
          const body = (await response.json()) as { id?: unknown };
          return typeof body.id === "string" && body.id.length <= 300
            ? { state: "sent", reference: body.id }
            : { state: "unknown" };
        }
        return {
          state:
            response.status >= 400 &&
            response.status < 500 &&
            response.status !== 408 &&
            response.status !== 409 &&
            response.status !== 429
              ? "failed"
              : "unknown",
        };
      } catch {
        return { state: "unknown" };
      }
    },
  };
}
export const escapeMail = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
export function mailDocument(
  locale: string,
  subject: string,
  lines: string[],
): Pick<MailMessage, "subject" | "text" | "html"> {
  return {
    subject,
    text: lines.join("\n\n"),
    html: `<!doctype html><html lang="${locale === "ar" || locale === "he" ? locale : "en"}" dir="${locale === "en" ? "ltr" : "rtl"}"><body style="background:#f6f3ed;color:#163c2a;font-family:Arial,sans-serif;padding:24px"><main style="max-width:560px;margin:auto;background:#fff;padding:32px"><p>Darb REST</p><h1>${escapeMail(subject)}</h1>${lines.map((line) => `<p style="white-space:pre-line;line-height:1.7">${escapeMail(line)}</p>`).join("")}</main></body></html>`,
  };
}
export type OutboxRow = Database["public"]["Tables"]["customer_mail_outbox"]["Row"];
export type MailBuilder = (row: OutboxRow) => Promise<MailMessage>;
/** No automatic retry of ambiguous delivery; a second worker cannot claim the same attempt. */
export async function deliverCustomerMail(id: string, build: MailBuilder): Promise<string> {
  const provider = transactionalProvider();
  if (!provider) return "unavailable";
  const db = getAdminClient();
  const { data: row, error } = await db
    .from("customer_mail_outbox")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !row || !["queued", "failed"].includes(row.state)) return "failed";
  const claim = crypto.randomUUID();
  const { data: claimed } = await db
    .from("customer_mail_outbox")
    .update({
      state: "sending",
      claim_id: claim,
      claimed_at: new Date().toISOString(),
      attempts: row.attempts + 1,
      error_code: null,
    })
    .eq("id", id)
    .eq("state", row.state)
    .eq("attempts", row.attempts)
    .select("id")
    .maybeSingle();
  if (!claimed) return "failed";
  let result: Awaited<ReturnType<TransactionalProvider["send"]>>;
  try {
    const message = await build(row);
    result = await provider.send(message, row.id);
  } catch {
    result = { state: "failed" };
  }
  const saved = await db
    .from("customer_mail_outbox")
    .update({
      state: result.state,
      provider_reference: result.reference ?? null,
      error_code: result.state === "sent" ? null : "provider_" + result.state,
      sent_at: result.state === "sent" ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .eq("claim_id", claim)
    .eq("state", "sending");
  return saved.error ? "unknown" : result.state;
}
export function localizedJson(value: Json, locale: string): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const result = value[locale] || value.en;
  return typeof result === "string" ? result : "";
}
