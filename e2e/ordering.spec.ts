import { test, expect } from "@playwright/test";
const customerUrl = "http://localhost:3100/en/order/darb-bistro/haifa-port";
test("guest mobile cart validates choices, persists a draft, submits once and reaches admin", async ({
  page,
  browser,
}) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(customerUrl);
  await expect(page.getByRole("heading", { name: "Darb Bistro", exact: true })).toBeVisible();
  await expect(page.getByText("Evening table", { exact: true })).toHaveCount(0);
  await page
    .locator("article")
    .filter({ hasText: "House latte" })
    .getByRole("button", { name: "Add to cart", exact: true })
    .click();
  let modal = page.getByRole("dialog");
  await modal.getByRole("button", { name: "Add to cart", exact: true }).click();
  await expect(modal.getByRole("alert")).toContainText("variant");
  await modal.getByRole("radio", { name: /Large/ }).check();
  await modal.getByRole("button", { name: "Add to cart", exact: true }).click();
  await expect(modal.getByRole("alert")).toContainText("choices");
  await modal.getByRole("checkbox", { name: /Oat milk/ }).check();
  await modal.getByLabel("Quantity", { exact: true }).fill("2");
  await modal.getByRole("button", { name: /Add to cart/ }).click();
  await expect(modal).not.toBeVisible();
  await page.getByRole("button", { name: "Review order", exact: true }).click();
  await expect(modal).toContainText("44.00");
  await modal.getByLabel("Your name", { exact: true }).fill("Guest E2E");
  await modal.getByRole("radio", { name: "Takeaway", exact: true }).check();
  await modal.getByLabel("Phone number", { exact: true }).fill("+972501234567");
  await modal.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(modal.getByRole("status")).toContainText("Draft saved");
  await page.reload();
  await page.getByRole("button", { name: "Review order", exact: true }).click();
  await expect(modal.getByLabel("Your name", { exact: true })).toHaveValue("Guest E2E");
  await expect(modal).toContainText("44.00");
  await modal.getByLabel("Quantity", { exact: true }).fill("3");
  await expect(modal).toContainText("66.00");
  await modal.getByRole("button", { name: "Continue to checkout", exact: true }).click();
  await modal.getByRole("button", { name: "Confirm order", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Your order has been sent" })).toBeVisible();
  const id = (await page
    .locator("p")
    .filter({ hasText: "Order reference:" })
    .locator("bdi")
    .textContent())!;
  expect(id).toMatch(/^[a-f0-9-]{36}$/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Your order has been sent" })).toBeVisible();
  const other = await browser.newContext();
  const guest = await other.newPage();
  await guest.goto(customerUrl);
  await guest.getByRole("button", { name: "Review order", exact: true }).click();
  await expect(guest.getByRole("dialog")).toContainText("Your cart is empty");
  await other.close();
  await page.goto("http://localhost:3101/en/auth/signin");
  await page.locator("input[type=email]").fill("staff@phase4.example");
  await page.locator("input[type=password]").fill("Local-phase4-test-only-2026!");
  await page.locator("button[type=submit]").click();
  await expect(page).toHaveURL(/\/en$/);
  await page.goto("http://localhost:3101/en/orders/" + id);
  await expect(page.getByRole("heading", { name: "Order details" })).toBeVisible();
  await expect(page.locator("main")).toContainText("66.00");
  await expect(page.locator("main")).toContainText("Oat milk");
  await expect(page.getByText("Pay at restaurant", { exact: false })).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Record payment received", exact: true }).click();
  await expect(page.getByText("Paid", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Accepted", exact: true }).click();
  await expect(page.getByRole("button", { name: "Preparing", exact: true })).toBeVisible();
});
for (const locale of ["ar", "he"]) {
  test(`public ${locale} cart is RTL and stays within mobile widths`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(customerUrl.replace("/en/", "/" + locale + "/"));
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    const article = page.locator("article").first();
    await article.getByRole("button").click();
    const d = page.getByRole("dialog");
    await expect(d).toBeVisible();
    expect(await d.evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
    await d.locator("button[type=submit]").click();
    await expect(d).not.toBeVisible();
    await page
      .getByRole("button", { name: locale === "ar" ? "مراجعة الطلب" : "בדיקת ההזמנה", exact: true })
      .click();
    await expect(d).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await d.locator("article button").last().click();
    await expect(d.locator("article")).toHaveCount(0);
  });
}
