import { describe, it, expect } from "vitest";
import { domainHostname, jsonLd, restaurantCanonical } from "../launch";
import { publicOrigin, validateProduction } from "@darb-rest/config";
describe("launch security contracts", () => {
  it("normalizes public DNS hosts and rejects URL injection", () => {
    expect(domainHostname(" MENU.Example.org ")).toBe("menu.example.org");
    for (const host of [
      "https://example.org",
      "example.org:443",
      "evil.org/path",
      "user@example.org",
      "*.example.org",
      "localhost",
      "127.0.0.1",
      "a.local",
      "a.internal",
      "a..org",
      "-bad.org",
      "example.org,evil.org",
      "example.org.",
    ])
      expect(domainHostname(host)).toBeNull();
  });
  it("constructs locale/branch canonicals without private context", () => {
    expect(restaurantCanonical("https://public.example", "bistro", "ar", "port")).toBe(
      "https://public.example/ar/bistro?branch=port",
    );
    expect(restaurantCanonical("https://menu.example", "bistro", "he", "port", true)).toBe(
      "https://menu.example/he?branch=port",
    );
  });
  it("escapes script delimiters but keeps valid structured JSON", () => {
    const data = { name: "</script><script>alert(1)</script>", type: "Restaurant" };
    const text = jsonLd(data);
    expect(text).not.toContain("<");
    expect(JSON.parse(text)).toEqual(data);
  });
  it("refuses missing production origins and insecure configuration", () => {
    expect(() => publicOrigin({ NODE_ENV: "production" })).toThrow();
    for (const url of [
      "http://example.org",
      "https://user:pass@example.org",
      "https://example.org/path",
      "https://example.org/?secret=a",
    ])
      expect(() => publicOrigin({ NODE_ENV: "production", NEXT_PUBLIC_WEB_URL: url })).toThrow();
    expect(() => validateProduction({ NODE_ENV: "development" })).not.toThrow();
    expect(() =>
      validateProduction({ NODE_ENV: "production", NEXT_PUBLIC_WEB_URL: "https://example.org" }),
    ).toThrow();
  });
  it("accepts explicit production configuration without a test gateway", () => {
    const env = {
      NODE_ENV: "production",
      NEXT_PUBLIC_WEB_URL: "https://example.org",
      NEXT_PUBLIC_ADMIN_URL: "https://admin.example.org",
      NEXT_PUBLIC_SUPABASE_URL: "https://database.example.org",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "public-placeholder-for-unit",
      SUPABASE_SERVICE_ROLE_KEY: "private-unit-value",
      PUBLIC_RATE_LIMIT_SECRET: "a".repeat(32),
      TRUSTED_CLIENT_IP_HEADER: "x-real-ip",
    };
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "public-unit-value";
    expect(() => validateProduction(env)).not.toThrow();
    expect(() => validateProduction({ ...env, PAYMENT_PROVIDER: "local-test" })).toThrow();
    expect(() =>
      validateProduction({ ...env, TRUSTED_CLIENT_IP_HEADER: "x-forwarded-for, other" }),
    ).toThrow();
  });
});
