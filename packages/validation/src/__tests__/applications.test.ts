import { describe, expect, it } from "vitest";
import { businessSlugSchema } from "../business";
import { acquisitionSchema, reviewApplicationSchema } from "../applications";
const valid = {
  kind: "application",
  full_name: " Test Owner ",
  business_name: "Test Café",
  email: "OWNER@example.com",
  phone: "+972 50 123 4567",
  city: "Nazareth",
  business_type: "cafe",
  branch_count: "2",
  requested_plan_code: "pro",
  message: "",
  locale: "en",
};
describe("controlled acquisition", () => {
  it("reserves the acquisition route from business slugs", () => {
    expect(businessSlugSchema.safeParse("get-started").success).toBe(false);
  });
  it("normalizes valid applications and preserves the selected plan", () => {
    const result = acquisitionSchema.parse(valid);
    expect(result).toMatchObject({
      full_name: "Test Owner",
      email: "owner@example.com",
      branch_count: 2,
      requested_plan_code: "pro",
    });
  });
  it.each(["en", "ar", "he"])("accepts %s locale", (locale) => {
    expect(acquisitionSchema.safeParse({ ...valid, locale }).success).toBe(true);
  });
  it.each([
    { email: "bad" },
    { phone: "-------" },
    { branch_count: 0 },
    { branch_count: 1.5 },
    { branch_count: 10001 },
    { business_type: "other" },
    { requested_plan_code: "free" },
    { full_name: " " },
    { city: "" },
    { message: "x".repeat(2001) },
    { status: "approved" },
    { reviewed_by: "spoof" },
    { locale: "fr" },
  ])("rejects invalid or privileged input %j", (changes) => {
    expect(acquisitionSchema.safeParse({ ...valid, ...changes }).success).toBe(false);
  });
  it("requires a real message for inquiries without requiring application details", () => {
    const input = {
      kind: "inquiry",
      full_name: "Guest",
      business_name: "Café",
      email: "guest@example.com",
      phone: "",
      locale: "ar",
      message: "Question",
    };
    expect(acquisitionSchema.safeParse(input).success).toBe(true);
    expect(acquisitionSchema.safeParse({ ...input, message: "" }).success).toBe(false);
  });
  it("validates review decisions, identifiers, plans and note length", () => {
    const input = {
      id: crypto.randomUUID(),
      status: "approved",
      requested_plan_code: "pro",
      internal_note: "Reviewed",
    };
    expect(reviewApplicationSchema.safeParse(input).success).toBe(true);
    expect(reviewApplicationSchema.safeParse({ ...input, status: "rejected" }).success).toBe(true);
    for (const change of [
      { status: "pending" },
      { id: "bad" },
      { requested_plan_code: "free" },
      { internal_note: "x".repeat(2001) },
    ])
      expect(reviewApplicationSchema.safeParse({ ...input, ...change }).success).toBe(false);
  });
});
