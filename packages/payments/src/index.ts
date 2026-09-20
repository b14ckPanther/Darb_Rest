// Server-runtime adapters only. Never export keys or instantiate providers in browser components.
import { createHmac, timingSafeEqual } from "node:crypto";
export type PaymentStatus = "pending" | "authorized" | "paid" | "failed" | "cancelled" | "refunded";
export interface PaymentRequest {
  id: string;
  amountCents: number;
  currency: string;
}
export interface PaymentEvent extends PaymentRequest {
  eventId: string;
  reference: string;
  status: Exclude<PaymentStatus, "pending">;
}
export interface PaymentProvider {
  readonly id: string;
  readonly testOnly: boolean;
  /** Must reuse id as the gateway idempotency key, including after timeouts. */
  createIntent(input: PaymentRequest): Promise<{ reference: string; redirectUrl?: string }>;
  /** Verify raw bytes/signature, then normalize only confirmed, complete payment amounts. */
  verifyWebhook(raw: string, headers: Headers): Promise<PaymentEvent>;
  /** Full refund only. Persisted refundId is the gateway idempotency key. No invoices. */
  refund(
    input: PaymentRequest & { reference: string; refundId: string },
  ): Promise<{ reference: string }>;
}
export function signTestWebhook(raw: string, secret: string, timestamp: number) {
  return `${timestamp}.${createHmac("sha256", secret).update(`${timestamp}.${raw}`).digest("hex")}`;
}
export class LocalTestProvider implements PaymentProvider {
  readonly id = "local-test";
  readonly testOnly = true;
  constructor(
    private readonly secret: string,
    private readonly now = () => Date.now(),
  ) {
    if (secret.length < 32) throw Error("Payment test secret must contain at least 32 characters");
  }
  async createIntent(input: PaymentRequest) {
    return { reference: `test_${input.id}` };
  }
  async refund(input: PaymentRequest & { reference: string; refundId: string }) {
    return { reference: `test_refund_${input.refundId}` };
  }
  async verifyWebhook(raw: string, headers: Headers): Promise<PaymentEvent> {
    const signature = headers.get("x-darb-test-signature") ?? "";
    const match = /^(\d{10})\.([a-f0-9]{64})$/.exec(signature);
    if (!match || Math.abs(this.now() / 1000 - Number(match[1])) > 300)
      throw Error("invalid_signature");
    const expected = signTestWebhook(raw, this.secret, Number(match[1]));
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected)))
      throw Error("invalid_signature");
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") throw Error("invalid_event");
    const e = value as PaymentEvent;
    if (
      !/^[a-f0-9-]{36}$/.test(e.id) ||
      typeof e.eventId !== "string" ||
      e.eventId.length < 1 ||
      e.eventId.length > 200 ||
      e.reference !== `test_${e.id}` ||
      !Number.isSafeInteger(e.amountCents) ||
      e.amountCents < 0 ||
      e.amountCents > 1000000000 ||
      !/^[A-Z]{3}$/.test(e.currency) ||
      !["authorized", "paid", "failed", "cancelled", "refunded"].includes(e.status)
    )
      throw Error("invalid_event");
    return e;
  }
}
export function selectPaymentProvider(
  env: Record<string, string | undefined>,
): PaymentProvider | null {
  // Fail closed: no default provider, no test adapter in production or against remote data.
  if (
    env.PAYMENT_PROVIDER !== "local-test" ||
    env.NODE_ENV === "production" ||
    !/^http:\/\/(localhost|127\.0\.0\.1):\d+\/?$/.test(env.NEXT_PUBLIC_SUPABASE_URL ?? "") ||
    !env.PAYMENT_TEST_WEBHOOK_SECRET ||
    env.PAYMENT_TEST_WEBHOOK_SECRET.length < 32
  )
    return null;
  return new LocalTestProvider(env.PAYMENT_TEST_WEBHOOK_SECRET);
}
