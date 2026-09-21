import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { commercialLabels } from "../packages/i18n/src/commercial";
import { DEFAULT_APPEARANCE } from "../packages/types/src/templates";
import { TEMPLATE_CATALOG } from "../packages/types/src/template-catalog";
const cfg = JSON.parse(
  execFileSync("supabase", ["status", "-o", "json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }),
);
if (!/^http:\/\/(localhost|127\.0\.0\.1):/.test(cfg.API_URL))
  throw Error("Local database required");
async function api(path: string, method = "GET", body?: unknown) {
  const r = await fetch(`${cfg.API_URL}/${path}`, {
    method,
    headers: {
      apikey: cfg.SERVICE_ROLE_KEY,
      Authorization: `Bearer ${cfg.SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw Error(`Local v1 fixture ${r.status}: ${path}`);
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}
test("database price edits propagate to every commercial surface and inactive plans disappear", async ({
  page,
}) => {
  test.setTimeout(120000);
  const plans = await api("rest/v1/plans?code=in.(starter,pro,business)&select=*");
  const starter = plans.find((p: { code: string }) => p.code === "starter");
  const email = `v1-${randomUUID()}@qa.example`,
    password = `Local-${randomUUID()}!`,
    user = await api("auth/v1/admin/users", "POST", { email, password, email_confirm: true });
  try {
    await api("rest/v1/platform_admins", "POST", { user_id: user.id });
    await page.goto("http://localhost:3101/en/auth/signin");
    await page.locator("input[type=email]").fill(email);
    await page.locator("input[type=password]").fill(password);
    await page.locator("button[type=submit]").click();
    await expect(page).toHaveURL(/\/en(?:\/platform)?$/);
    await page.goto("http://localhost:3101/en/platform/plans");
    const editor = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: starter.name.en, exact: true }) });
    const monthly = 173.27,
      yearly = 1623.19; // Explicit mutable commercial fixture, not launch-price expectations.
    await editor.getByLabel("Monthly price (ILS)", { exact: true }).fill(String(monthly));
    await editor.getByLabel("Yearly price (ILS)", { exact: true }).fill(String(yearly));
    await editor.getByRole("button", { name: "Save changes", exact: true }).first().click();
    await expect(editor.getByRole("status")).toHaveText("Changes saved");
    await page.goto("http://localhost:3100/en/pricing");
    const card = page.locator("[data-plan=starter]");
    await expect(card).toContainText(
      new Intl.NumberFormat("en", { style: "currency", currency: "ILS" }).format(monthly),
    );
    await page.getByRole("button", { name: "Yearly", exact: true }).click();
    await expect(card).toContainText(
      new Intl.NumberFormat("en", { style: "currency", currency: "ILS" }).format(yearly),
    );
    await page.goto("http://localhost:3100/en/get-started?plan=starter");
    await expect(page.locator("select[name=requested_plan_code]")).toHaveValue("starter");
    await expect(page.locator("option[value=starter]")).toContainText(String(monthly));
    await page.goto("http://localhost:3101/en/onboarding");
    await expect(page.locator("body")).not.toContainText("Enterprise");
    // The plan step is exercised by onboarding.spec; its server payload uses the same current RPC.
    const catalog = await api("rest/v1/rpc/public_commercial_plans", "POST", {});
    expect(catalog.find((p: { code: string }) => p.code === "starter").yearly_price_ils).toBe(
      yearly,
    );
    await api(`rest/v1/plans?id=eq.${starter.id}`, "PATCH", { is_active: false });
    await page.goto("http://localhost:3100/en/pricing");
    await expect(page.locator("[data-plan=starter]")).toHaveCount(0);
    await page.goto("http://localhost:3100/en/get-started?plan=starter");
    await expect(page.locator("select[name=requested_plan_code]")).toHaveValue("unsure");
  } finally {
    await api(`rest/v1/plans?id=eq.${starter.id}`, "PATCH", {
      monthly_price_ils: starter.monthly_price_ils,
      yearly_price_ils: starter.yearly_price_ils,
      is_active: starter.is_active,
    });
    await api(`rest/v1/platform_admins?user_id=eq.${user.id}`, "DELETE");
    await api(`auth/v1/admin/users/${user.id}`, "DELETE");
  }
});
test("v1 template menus, scoped WhatsApp cart and reservation requests across locales", async ({
  page,
}) => {
  test.setTimeout(180000);
  const [business] = await api("rest/v1/businesses?slug=eq.darb-bistro&select=id,plan_id");
  const [location] = await api(
    `rest/v1/locations?business_id=eq.${business.id}&slug=eq.haifa-port&select=id,whatsapp_number`,
  );
  const [settings] = await api(
    `rest/v1/business_settings?business_id=eq.${business.id}&select=whatsapp_number`,
  );
  const plans = await api("rest/v1/plans?code=in.(starter,pro,business)&select=id,code");
  const [appearance] = await api(
    `rest/v1/restaurant_appearance?business_id=eq.${business.id}&select=published`,
  );
  const destination = "+972501234567",
    branchNumber = "+972509876543";
  try {
    await api(`rest/v1/business_settings?business_id=eq.${business.id}`, "PATCH", {
      whatsapp_number: destination,
    });
    await api(`rest/v1/locations?id=eq.${location.id}`, "PATCH", { whatsapp_number: branchNumber });
    await api(`rest/v1/businesses?id=eq.${business.id}`, "PATCH", {
      plan_id: plans.find((p: { code: string }) => p.code === "starter").id,
    });
    await page.goto("http://localhost:3100/en/darb-bistro?branch=haifa-port");
    await expect(page.getByRole("button", { name: "Add to cart", exact: true })).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Request a reservation", exact: true }),
    ).toHaveCount(0);
    await expect(page.locator("[data-template]")).toBeVisible();
    await api(`rest/v1/businesses?id=eq.${business.id}`, "PATCH", {
      plan_id: plans.find((p: { code: string }) => p.code === "pro").id,
    });
    for (const locale of ["en", "ar", "he"] as const) {
      const L = commercialLabels[locale];
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`http://localhost:3100/${locale}/darb-bistro?branch=haifa-port`);
      await expect(page.locator("html")).toHaveAttribute("dir", locale === "en" ? "ltr" : "rtl");
      await page
        .locator("article")
        .filter({ hasText: /House latte|لاتيه|לאטה/ })
        .getByRole("button", { name: L.add, exact: true })
        .first()
        .click();
      const modal = page.getByRole("dialog");
      await modal.getByRole("radio").last().check();
      await modal.getByRole("checkbox").first().check();
      await modal.getByRole("button", { name: L.add, exact: true }).click();
      await expect(modal).not.toBeVisible();
      await page.getByRole("button", { name: new RegExp("^" + L.cart + " ·") }).click();
      await modal.getByLabel(L.name, { exact: true }).fill("Guest");
      await modal.getByLabel(L.phone, { exact: true }).fill("+972501111111");
      await modal.getByRole("button", { name: L.send, exact: true }).click();
      const link = modal.getByRole("link", { name: L.open, exact: true });
      await expect(link).toBeVisible();
      expect(await link.getAttribute("href")).toContain(
        `https://wa.me/${destination.slice(1)}?text=`,
      );
      await modal.getByRole("button", { name: L.close, exact: true }).click();
      await page.getByRole("button", { name: L.request, exact: true }).click();
      await modal.getByLabel(L.name, { exact: true }).fill("Guest");
      await modal.getByLabel(L.phone, { exact: true }).fill("+972501111111");
      await modal.getByLabel(L.guests, { exact: true }).fill("3");
      await modal.getByLabel(L.date, { exact: true }).fill("2027-04-12");
      await modal.getByLabel(L.time, { exact: true }).fill("19:30");
      await modal.getByRole("button", { name: L.send, exact: true }).click();
      await expect(modal.getByRole("link", { name: L.open, exact: true })).toBeVisible();
      await modal.getByRole("button", { name: L.close, exact: true }).click();
    }
    await api(`rest/v1/businesses?id=eq.${business.id}`, "PATCH", {
      plan_id: plans.find((p: { code: string }) => p.code === "business").id,
    });
    await page.goto("http://localhost:3100/en/darb-bistro?branch=haifa-port");
    await page.getByRole("button", { name: "Request a reservation", exact: true }).click();
    const m = page.getByRole("dialog");
    await m.getByLabel("Full name", { exact: true }).fill("Guest");
    await m.getByLabel("Phone", { exact: true }).fill("+972501111111");
    await m.getByLabel("Guests", { exact: true }).fill("2");
    await m.getByLabel("Date", { exact: true }).fill("2027-04-12");
    await m.getByLabel("Time", { exact: true }).fill("19:00");
    await m.getByRole("button", { name: "Continue in WhatsApp" }).click();
    await expect(m.getByRole("link", { name: "Open WhatsApp" })).toHaveAttribute(
      "href",
      new RegExp(`^https://wa.me/${branchNumber.slice(1)}`),
    );
    for (const template of TEMPLATE_CATALOG) {
      await api(`rest/v1/restaurant_appearance?business_id=eq.${business.id}`, "PATCH", {
        published: { ...DEFAULT_APPEARANCE, template: template.id },
      });
      for (const locale of ["en", "ar", "he"]) {
        await page.goto(`http://localhost:3100/${locale}/darb-bistro?branch=haifa-port`);
        await expect(page.locator("[data-template]")).toHaveAttribute("data-template", template.id);
        const L = commercialLabels[locale as "en" | "ar" | "he"];
        await page.locator("article").first().getByRole("button").click();
        await expect(page.getByRole("dialog")).toBeVisible();
        if (template.id === "signature") {
          await page.setViewportSize({ width: 390, height: 844 });
          await page.screenshot({ path: `.tmp/ui-qa/v1/configuration-${locale}.png` });
        }
        await page.getByRole("dialog").getByRole("button", { name: L.close, exact: true }).click();
        for (const width of [375, 390, 393, 430, 768, 834, 1024, 1440]) {
          await page.setViewportSize({ width, height: 1000 });
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
          ).toBe(true);
        }
      }
    }
  } finally {
    await api(`rest/v1/businesses?id=eq.${business.id}`, "PATCH", { plan_id: business.plan_id });
    await api(`rest/v1/business_settings?business_id=eq.${business.id}`, "PATCH", {
      whatsapp_number: settings?.whatsapp_number ?? null,
    });
    await api(`rest/v1/locations?id=eq.${location.id}`, "PATCH", {
      whatsapp_number: location.whatsapp_number,
    });
    if (appearance)
      await api(`rest/v1/restaurant_appearance?business_id=eq.${business.id}`, "PATCH", {
        published: appearance.published,
      });
  }
});
test("pricing is multilingual and responsive at every required width", async ({ page }) => {
  test.setTimeout(120000);
  for (const locale of ["en", "ar", "he"] as const) {
    await page.goto(`http://localhost:3100/${locale}/pricing`);
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "en" ? "ltr" : "rtl");
    await expect(page.locator("[data-plan=pro]")).toContainText(commercialLabels[locale].popular);
    await expect(page.locator("[data-plan=business]")).toContainText(commercialLabels[locale].from);
    await expect(page.locator("main")).not.toContainText(
      /Enterprise|online payments|KDS|checkout/i,
    );
    for (const width of [375, 390, 393, 430, 768, 834, 1024, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await expect(page.locator("[data-plan=pro]")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      if ([390, 834, 1440].includes(width))
        await page.screenshot({
          path: `.tmp/ui-qa/v1/pricing-${locale}-${width}.png`,
          fullPage: true,
        });
    }
  }
});
