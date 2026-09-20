import { describe, it, expect } from "vitest";
import { LocalTestProvider, selectPaymentProvider, signTestWebhook } from "../index";
const secret = "test-only-secret-with-at-least-32-characters",
  now = 1800000000000;
const event = {
  id: "a0000000-0000-4000-8000-000000000001",
  eventId: "event-1",
  reference: "test_a0000000-0000-4000-8000-000000000001",
  amountCents: 4400,
  currency: "ILS",
  status: "paid",
};
const raw = JSON.stringify(event);
const headers = (body = raw, time = now / 1000) =>
  new Headers({ "x-darb-test-signature": signTestWebhook(body, secret, time) });
describe("payment provider boundary", () => {
  it("is unavailable without explicit configuration, remotely, and in production", () => {
    const env = {
      PAYMENT_PROVIDER: "local-test",
      PAYMENT_TEST_WEBHOOK_SECRET: secret,
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
      NODE_ENV: "development",
    };
    expect(selectPaymentProvider(env)?.id).toBe("local-test");
    expect(selectPaymentProvider({})).toBeNull();
    expect(selectPaymentProvider({ ...env, NODE_ENV: "production" })).toBeNull();
    expect(
      selectPaymentProvider({ ...env, NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co" }),
    ).toBeNull();
    expect(selectPaymentProvider({ ...env, PAYMENT_PROVIDER: "unknown" })).toBeNull();
  });
  it("reuses provider references on identical intent retries", async () => {
    const p = new LocalTestProvider(secret);
    expect(await p.createIntent(event)).toEqual(await p.createIntent(event));
  });
  it("verifies the raw body before trusting amounts", async () => {
    const p = new LocalTestProvider(secret, () => now);
    expect(await p.verifyWebhook(raw, headers())).toEqual(event);
    await expect(p.verifyWebhook(raw.replace("4400", "1"), headers())).rejects.toThrow(
      "invalid_signature",
    );
    await expect(p.verifyWebhook(raw, new Headers())).rejects.toThrow("invalid_signature");
  });
  it("rejects expired/future signatures and malformed normalized events", async () => {
    const p = new LocalTestProvider(secret, () => now);
    await expect(p.verifyWebhook(raw, headers(raw, now / 1000 - 301))).rejects.toThrow(
      "invalid_signature",
    );
    await expect(p.verifyWebhook(raw, headers(raw, now / 1000 + 301))).rejects.toThrow(
      "invalid_signature",
    );
    const bad = JSON.stringify({ ...event, amountCents: -1 });
    await expect(p.verifyWebhook(bad, headers(bad))).rejects.toThrow("invalid_event");
  });
  it("gives full refunds stable idempotency references", async () => {
    const p = new LocalTestProvider(secret),
      input = { ...event, refundId: "refund-1" };
    expect(await p.refund(input)).toEqual(await p.refund(input));
  });
});
