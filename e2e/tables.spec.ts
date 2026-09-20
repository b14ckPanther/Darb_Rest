import { createRequire } from "node:module";
import { tableQrUrl } from "../packages/types/src/tables";
import { test, expect } from "@playwright/test";
import { PNG } from "pngjs";
import jsQR from "jsqr";
const admin = "http://localhost:3101",
  web = "http://localhost:3100";
async function login(page: import("@playwright/test").Page) {
  await page.goto(admin + "/en/auth/signin");
  await page.locator("input[type=email]").fill("manager@phase4.example");
  await page.locator("input[type=password]").fill("Local-phase4-test-only-2026!");
  await page.locator("button[type=submit]").click();
  await expect(page).toHaveURL(/\/en$/);
}
test("table QR lifecycle, download, guest linkage and revocation", async ({ page, browser }) => {
  test.setTimeout(60000);
  await login(page);
  await page.goto(admin + "/en/tables");
  await expect(
    page.getByRole("heading", { name: "Tables & QR", exact: true }),
    "Apply migration 7 locally before running table integration tests",
  ).toBeVisible();
  const name = "E2E " + Date.now();
  await page.getByRole("button", { name: "Add table", exact: true }).click();
  await page.getByLabel("Table name or number").fill(name);
  await page.getByLabel("Area / section (optional)").fill("Patio");
  await page.getByRole("button", { name: "Save table", exact: true }).click();
  const card = page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name, exact: true }) });
  await expect(card).toBeVisible();
  await card.getByRole("link", { name: "View QR" }).click();
  await expect(page.getByRole("img", { name: "Scan to open the menu" })).toBeVisible();
  const link = (await page.getByRole("link", { name: "Open menu" }).getAttribute("href"))!;
  const pngResponse = await page.request.get(
    (await page.getByRole("link", { name: "Download PNG" }).getAttribute("href"))!,
  );
  expect(pngResponse.ok()).toBe(true);
  const png = PNG.sync.read(await pngResponse.body());
  const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  expect(decoded?.data).toBe(link);
  const token = link.split("/").pop()!;
  expect(token).toMatch(/^[a-f0-9]{64}$/);
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }),
    guest = await ctx.newPage();
  await guest.goto(`${web}/en/q/${token}`);
  await expect(guest).toHaveURL(/\/en\/order\/darb-bistro\/haifa-port\?table=/);
  await expect(guest.getByText(name, { exact: true })).toBeVisible();
  for (const locale of ["ar", "he"]) {
    await guest.setViewportSize({ width: 375, height: 812 });
    await guest.goto(`${web}/${locale}/q/${token}`);
    await expect(guest.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(guest.getByText(name, { exact: true })).toBeVisible();
    expect(await guest.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await guest.goto(`${web}/en/q/${token}`);
  await guest.locator("article").first().getByRole("button").click();
  await guest.getByRole("dialog").locator("button[type=submit]").click();
  await guest.getByRole("button", { name: "Review order", exact: true }).click();
  let d = guest.getByRole("dialog");
  await d.locator("input[autocomplete=name]").fill("QR guest");
  await d.locator("button[type=submit]").click();
  await d.getByRole("button", { name: "Confirm order", exact: true }).click();
  await expect(guest.getByRole("heading", { name: "Your order has been sent" })).toBeVisible();
  await expect(guest.getByText(name, { exact: true })).toBeVisible();
  const order = (await guest
    .locator("p")
    .filter({ hasText: "Order reference:" })
    .locator("bdi")
    .textContent())!;
  await page.goto(`${admin}/en/orders/${order}`);
  await expect(page.getByText(name, { exact: true })).toBeVisible();
  await page.goto(admin + "/en/tables");
  page.once("dialog", (dialog) => dialog.accept());
  await card.getByRole("button", { name: "Regenerate QR", exact: true }).click();
  await expect(card.getByRole("button", { name: "Regenerate QR" })).toBeEnabled();
  await guest.goto(`${web}/en/q/${token}`);
  await expect(
    guest.getByRole("heading", { name: "This table link is unavailable" }),
  ).toBeVisible();
  await card.getByRole("link", { name: "View QR" }).click();
  const regenerated = (await page.getByRole("link", { name: "Open menu" }).getAttribute("href"))!
    .split("/")
    .pop()!;
  expect(regenerated).not.toBe(token);
  await page.goto(admin + "/en/tables");
  page.once("dialog", (dialog) => dialog.accept());
  await card.getByRole("button", { name: "Revoke QR", exact: true }).click();
  await expect(card.getByRole("link", { name: "View QR" })).toHaveCount(0);
  await guest.goto(`${web}/en/q/${regenerated}`);
  await expect(
    guest.getByRole("heading", { name: "This table link is unavailable" }),
  ).toBeVisible();
  await ctx.close();
});
for (const locale of ["ar", "he"])
  test(`${locale} invalid QR is localized on mobile`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${web}/${locale}/q/not-a-token`);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(
      page.getByRole("heading", {
        name: locale === "ar" ? "رابط الطاولة غير متاح" : "קישור השולחן אינו זמין",
      }),
    ).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });

test("QR image round-trip preserves opaque payload in all locales", async () => {
  const qr = createRequire(new URL("../apps/admin/package.json", import.meta.url))("qrcode");
  for (const locale of ["ar", "he", "en"]) {
    const url = tableQrUrl("https://rest.darb.co.il", locale, "abcdef0123456789".repeat(4));
    const png = PNG.sync.read(
      await qr.toBuffer(url, { errorCorrectionLevel: "Q", margin: 4, width: 800 }),
    );
    const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
    expect(decoded?.data).toBe(url);
  }
});
