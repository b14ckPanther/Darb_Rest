import { test, expect } from "@playwright/test";
const root = "http://localhost:3100";
async function configure(page: import("@playwright/test").Page, locale = "en") {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${root}/${locale}/order/darb-bistro/haifa-port`);
  await page.locator("article").first().getByRole("button").click();
  await page.getByRole("dialog").locator("button[type=submit]").click();
  await page
    .getByRole("button", {
      name: locale === "en" ? "Review order" : locale === "ar" ? "مراجعة الطلب" : "בדיקת ההזמנה",
      exact: true,
    })
    .click();
  const modal = page.getByRole("dialog");
  await modal.locator('input[autocomplete="name"]').fill("Payment guest");
  await modal.locator("button[type=submit]").click();
  return modal;
}
test("online test checkout confirms signed payment and full refund", async ({ page }) => {
  const d = await configure(page);
  await expect(d.getByRole("heading", { name: "Continue to checkout" })).toBeVisible();
  await d.getByRole("radio", { name: "Pay online", exact: true }).check();
  await d.getByRole("button", { name: "Confirm order", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Awaiting payment" })).toBeVisible();
  await expect(page.getByText("Local test payment. No money will be charged.")).toBeVisible();
  await page.getByRole("button", { name: "Simulate payment success", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your order has been sent" })).toBeVisible();
  await expect(page.getByText("Paid", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Paid", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Simulate full refund", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Payment refunded" })).toBeVisible();
});
test("failed payment shows a recoverable guest outcome", async ({ page }) => {
  const d = await configure(page);
  await d.getByRole("radio", { name: "Pay online", exact: true }).check();
  await d.getByRole("button", { name: "Confirm order", exact: true }).click();
  await page.getByRole("button", { name: "Simulate payment failure", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Payment was unsuccessful" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Start another order", exact: true }),
  ).toBeVisible();
});
for (const locale of ["ar", "he"]) {
  test(`${locale} mobile checkout preserves RTL`, async ({ page }) => {
    const d = await configure(page, locale);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    expect(await d.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    await expect(d.locator('input[name="payment"]')).toHaveCount(2);
    await d.locator("button[type=submit]").click();
    await expect(d).not.toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: locale === "ar" ? "تم إرسال طلبك" : "ההזמנה נשלחה",
        exact: true,
      }),
    ).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}
test("webhook endpoint rejects unsigned and oversized callbacks", async ({ request }) => {
  expect(
    (
      await request.post(`${root}/api/payments/webhooks/local-test`, { data: { status: "paid" } })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post(`${root}/api/payments/webhooks/local-test`, { data: "x".repeat(17000) })
    ).status(),
  ).toBe(413);
  expect((await request.post(`${root}/api/payments/webhooks/unknown`, { data: {} })).status()).toBe(
    404,
  );
});
