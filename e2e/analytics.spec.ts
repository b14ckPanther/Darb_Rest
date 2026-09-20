import { test, expect } from "@playwright/test";
import { getDictionary } from "../packages/i18n/src";
for (const locale of ["en", "ar", "he"] as const)
  test(`${locale} real analytics filters, export and responsive report (requires migration 13)`, async ({
    page,
  }) => {
    test.setTimeout(60000);
    // Submit through the real guest flow so chart QA never silently covers only an empty state.
    await page.goto("http://localhost:3100/en/order/darb-bistro/haifa-port");
    await page
      .locator("article")
      .first()
      .getByRole("button", { name: "Add to cart", exact: true })
      .click();
    await page.getByRole("dialog").locator("button[type=submit]").click();
    await page.getByRole("button", { name: "Review order", exact: true }).click();
    await page.getByRole("dialog").locator('input[autocomplete="name"]').fill("Analytics QA guest");
    await page.getByRole("dialog").locator("button[type=submit]").click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Confirm order", exact: true })
      .click();
    await expect(page.getByRole("heading", { name: "Your order has been sent" })).toBeVisible();
    await page.goto("/en/auth/signin");
    await page.locator("input[type=email]").fill("admin@phase4.example");
    await page.locator("input[type=password]").fill("Local-phase4-test-only-2026!");
    await page.locator("button[type=submit]").click();
    await expect(page).toHaveURL(/\/en$/);
    await page.goto(`/${locale}/analytics`);
    const L = getDictionary(locale).analytics;
    await expect(
      page.locator("[data-analytics]"),
      "Operator must apply migration 13 before real analytics validation",
    ).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "en" ? "ltr" : "rtl");
    await expect(page.getByRole("heading", { name: L.items, exact: true })).toBeVisible();
    for (const width of [390, 430, 834, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
        .toBe(true);
      if (width >= 1024)
        await expect
          .poll(() =>
            page.locator("main").evaluate((el) => {
              const r = el.getBoundingClientRect();
              return document.documentElement.dir === "rtl"
                ? r.right <= innerWidth - 239
                : r.left >= 239;
            }),
          )
          .toBe(true);
      await page.screenshot({
        animations: "disabled",
        path: `.tmp/ui-qa/analytics-${locale}-${width}.png`,
        fullPage: true,
      });
    }
    const font = await page
      .locator("[data-analytics] h1")
      .evaluate((el) => getComputedStyle(el).fontFamily);
    expect(font.toLowerCase()).toContain({ en: "ubuntu", ar: "cairo", he: "heebo" }[locale]);
    await page
      .locator('select[name="branch"]')
      .selectOption("c1111111-1111-1111-1111-111111111111");
    await page.getByRole("button", { name: L.apply }).click();
    await expect(page).toHaveURL(/branch=c1111111-1111-1111-1111-111111111111/);
    await expect(page.locator('select[name="branch"]')).toHaveValue(
      "c1111111-1111-1111-1111-111111111111",
    );
    const response = await page.request.get(
      (await page.getByRole("link", { name: L.export }).getAttribute("href")) ?? "",
    );
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("text/csv");
    expect(response.headers()["cache-control"]).toContain("no-store");
    const csv = await response.text();
    expect(csv).toContain(L.period);
    expect(csv).toContain(L.paid);
    expect(csv).toContain("Asia/Jerusalem");
    expect(csv).not.toContain("@phase4.example");
    const download = page.waitForEvent("download");
    await page.getByRole("link", { name: L.export }).click();
    expect((await download).suggestedFilename()).toBe("analytics.csv");
    await page.locator("input[name=from]").fill("2001-01-01");
    await page.locator("input[name=to]").fill("2001-01-02");
    await page.getByRole("button", { name: L.apply }).click();
    await expect(page.getByRole("status")).toHaveText(L.empty);
    await page.goto(`/${locale}/analytics?branch=ffffffff-ffff-4fff-8fff-ffffffffffff`);
    await expect(page.getByRole("alert").filter({ hasText: L.invalid })).toHaveText(L.invalid);
  });
