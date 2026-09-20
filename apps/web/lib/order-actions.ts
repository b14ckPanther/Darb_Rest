"use server";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { orderInputSchema, orderError } from "@darb-rest/validation";
import type { OrderResult, OrderSummary, PaymentSummary } from "@darb-rest/types";
import { GUEST_COOKIE, guestDb, loadGuestDraft } from "./guest-orders";
import { paymentProvider, processPaymentWebhook } from "./payments";
import { signTestWebhook } from "@darb-rest/payments";
import { createHash } from "node:crypto";
export async function saveGuestOrder(
  businessSlug: string,
  locationSlug: string,
  raw: unknown,
  tableToken: string | null = null,
): Promise<OrderResult> {
  try {
    const parsed = orderInputSchema.safeParse(raw);
    if (
      !parsed.success ||
      !/^[a-z0-9-]{1,100}$/.test(businessSlug) ||
      !/^[a-z0-9-]{1,100}$/.test(locationSlug)
    )
      return { ok: false, error: "invalid_cart" };
    const c = parsed.data;
    if (c.submit) return { ok: false, error: "invalid_cart" };
    const token = await guestToken();
    const { data, error } = await guestDb().rpc("save_table_guest_order", {
      p_table_token: tableToken,
      p_id: c.id,
      p_business_slug: businessSlug,
      p_location_slug: locationSlug,
      p_lines: c.lines,
      p_customer_name: c.customer_name,
      p_customer_phone: c.customer_phone,
      p_fulfillment_mode: c.fulfillment_mode,
      p_expected_subtotal_cents: c.expected_subtotal_cents,
      p_revision: c.revision,
      p_submit: c.submit,
      p_guest_token: token,
    });
    if (error) return { ok: false, error: orderError(error.message) };
    const {
      id,
      business_id,
      location_id,
      status,
      fulfillment_mode,
      customer_name,
      customer_phone,
      currency,
      subtotal_cents,
      revision,
      created_at,
      updated_at,
      cart,
      table_id,
      table_name,
      table_area,
    } = data;
    return {
      ok: true,
      order: {
        id,
        business_id,
        location_id,
        status,
        fulfillment_mode,
        customer_name,
        customer_phone,
        currency,
        subtotal_cents,
        revision,
        created_at,
        updated_at,
        cart,
        table_id,
        table_name,
        table_area,
      } as unknown as OrderSummary,
    };
  } catch {
    return { ok: false, error: "save_error" };
  }
}

async function guestToken() {
  const jar = await cookies();
  let token = jar.get(GUEST_COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    token = randomBytes(32).toString("hex");
    jar.set(GUEST_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 86400,
    });
  }
  return token;
}

export async function checkoutGuestOrder(
  businessSlug: string,
  locationSlug: string,
  raw: unknown,
  method: "restaurant" | "online",
  tableToken: string | null = null,
): Promise<OrderResult> {
  try {
    const parsed = orderInputSchema.safeParse(raw);
    if (
      !parsed.success ||
      !parsed.data.submit ||
      !/^[a-z0-9-]{1,100}$/.test(businessSlug) ||
      !/^[a-z0-9-]{1,100}$/.test(locationSlug) ||
      !["restaurant", "online"].includes(method)
    )
      return { ok: false, error: "invalid_cart" };
    const provider = method === "online" ? paymentProvider() : null;
    if (method === "online" && !provider) return { ok: false, error: "onlineUnavailable" };
    const c = parsed.data,
      token = await guestToken();
    const { data: p, error } = await guestDb().rpc("checkout_table_guest_order", {
      p_table_token: tableToken,
      p_id: c.id,
      p_business_slug: businessSlug,
      p_location_slug: locationSlug,
      p_lines: c.lines,
      p_customer_name: c.customer_name,
      p_customer_phone: c.customer_phone,
      p_fulfillment_mode: c.fulfillment_mode,
      p_expected_subtotal_cents: c.expected_subtotal_cents,
      p_revision: c.revision,
      p_guest_token: token,
      p_method: method,
      p_provider: provider?.id ?? "restaurant",
    });
    if (error) return { ok: false, error: orderError(error.message) };
    // Recoverable after network/provider failure: retry the exact same payment UUID.
    let redirectUrl: string | undefined;
    if (provider && p.status === "pending") {
      const intent = await provider.createIntent({
        id: p.id,
        amountCents: p.amount_cents,
        currency: p.currency,
      });
      const attached = await guestDb().rpc("attach_payment_reference", {
        p_id: p.id,
        p_provider: provider.id,
        p_reference: intent.reference,
      });
      if (attached.error) throw attached.error;
      if (intent.redirectUrl) {
        const url = new URL(intent.redirectUrl);
        const origins = (process.env.PAYMENT_REDIRECT_ORIGINS ?? "").split(",");
        if (url.protocol !== "https:" || !origins.includes(url.origin))
          throw Error("Invalid provider redirect");
        redirectUrl = url.href;
      }
    }
    const { data: persisted } = await guestDb()
      .from("orders")
      .select("location_id")
      .eq("id", p.order_id)
      .eq("business_id", p.business_id)
      .single();
    const order = persisted
      ? await loadGuestDraft(p.business_id, persisted.location_id, c.id)
      : null;
    if (!order) throw Error("Missing checkout order");
    return { ok: true, order, payment: paymentSummary(p as PaymentSummary), redirectUrl };
  } catch {
    return { ok: false, error: "save_error" };
  }
}
function paymentSummary(p: PaymentSummary): PaymentSummary {
  return {
    id: p.id,
    method: p.method,
    status: p.status,
    amount_cents: p.amount_cents,
    currency: p.currency,
    reference: p.reference,
  };
}
export async function simulatePayment(
  id: string,
  status: "paid" | "failed" | "cancelled" | "refunded",
): Promise<boolean> {
  const provider = paymentProvider();
  if (
    !provider?.testOnly ||
    !/^[a-f0-9-]{36}$/.test(id) ||
    !["paid", "failed", "cancelled", "refunded"].includes(status)
  )
    return false;
  const token = (await cookies()).get(GUEST_COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return false;
  const db = guestDb();
  const { data: p } = await db
    .from("payments")
    .select("*")
    .eq("id", id)
    .eq("provider", provider.id)
    .maybeSingle();
  if (!p) return false;
  const { data: o } = await db
    .from("orders")
    .select("id")
    .eq("id", p.order_id)
    .eq("guest_token_hash", createHash("sha256").update(token).digest("hex"))
    .maybeSingle();
  if (!o) return false;
  const raw = JSON.stringify({
    id: p.id,
    eventId: `${p.id}:${status}`,
    reference: p.provider_reference,
    amountCents: p.amount_cents,
    currency: p.currency,
    status,
  });
  const signature = signTestWebhook(
    raw,
    process.env.PAYMENT_TEST_WEBHOOK_SECRET!,
    Math.floor(Date.now() / 1000),
  );
  return (
    (
      await processPaymentWebhook(
        provider.id,
        raw,
        new Headers({ "x-darb-test-signature": signature }),
      )
    ).status === 200
  );
}

export async function saveQrOrder(
  businessSlug: string,
  locationSlug: string,
  tableToken: string | null,
  raw: unknown,
) {
  return saveGuestOrder(businessSlug, locationSlug, raw, tableToken);
}
export async function checkoutQrOrder(
  businessSlug: string,
  locationSlug: string,
  tableToken: string | null,
  raw: unknown,
  method: "restaurant" | "online",
) {
  return checkoutGuestOrder(businessSlug, locationSlug, raw, method, tableToken);
}
