import "server-only";
import { createHash } from "node:crypto";
import { selectPaymentProvider } from "@darb-rest/payments";
import { guestDb } from "./guest-orders";
export const paymentProvider = () => selectPaymentProvider(process.env);
export async function processPaymentWebhook(providerId: string, raw: string, headers: Headers) {
  const provider = paymentProvider();
  if (!provider || provider.id !== providerId) return { status: 404 };
  if (Buffer.byteLength(raw) > 16384) return { status: 413 };
  let event;
  try {
    event = await provider.verifyWebhook(raw, headers);
  } catch {
    return { status: 400 };
  }
  const { error } = await guestDb().rpc("apply_payment_event", {
    p_id: event.id,
    p_provider: provider.id,
    p_reference: event.reference,
    p_event_id: event.eventId,
    p_payload_hash: createHash("sha256").update(raw).digest("hex"),
    p_status: event.status,
    p_amount_cents: event.amountCents,
    p_currency: event.currency,
  });
  // Non-2xx allows retries, including a callback racing provider-reference attachment.
  return { status: error ? 409 : 200 };
}
