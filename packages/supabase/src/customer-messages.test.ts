import { describe, it, expect, vi } from "vitest";
const fixtures = vi.hoisted(() => ({
  restaurant_applications: {
    email: "customer@qa.example",
    business_name: "QA restaurant",
    locale: "ar",
    customer_safe_message: "Customer-safe message",
    internal_note: "PRIVATE OPERATOR NOTE",
  },
  platform_billing_settings: {
    bit_enabled: true,
    bit_phone: "+972500000001",
    bit_instructions: { ar: "تعليمات الاختبار" },
    bank_enabled: false,
    bank_account_number: "PRIVATE DISABLED ACCOUNT",
    support_email: "support@qa.example",
    sender_name: "Darb QA",
  },
  customer_agreements: {
    plan_name: { ar: "باقة الاختبار" },
    billing_cycle: "yearly",
    agreed_amount_ils: 321.45,
    payment_reference: "DR-QA",
    payment_due_at: "2026-10-01T00:00:00Z",
  },
}));
vi.mock("./admin", () => ({
  getAdminClient: () => ({
    from: (table: keyof typeof fixtures) => ({
      select: () => ({
        eq: () => ({ single: async () => ({ data: fixtures[table], error: null }) }),
      }),
    }),
  }),
}));
import { buildCustomerMessage } from "./customer-messages";
import type { OutboxRow } from "./customer-mail";
describe("customer mail allowlist", () => {
  it("uses approved terms and only enabled payment instructions", async () => {
    const message = await buildCustomerMessage({
      kind: "approval",
      application_id: "test",
      agreement_id: "test",
    } as OutboxRow);
    expect(message.to).toBe("customer@qa.example");
    expect(message.text).toContain("DR-QA");
    expect(message.text).toContain("+972500000001");
    expect(message.html).toContain('dir="rtl"');
    expect(message.text).not.toContain("PRIVATE");
    expect(message.html).not.toContain("PRIVATE");
  });
  it("rejection contains the customer-safe message only", async () => {
    const message = await buildCustomerMessage({
      kind: "rejection",
      application_id: "test",
    } as OutboxRow);
    expect(message.text).toContain("Customer-safe message");
    expect(message.text).not.toContain("OPERATOR");
  });
});
