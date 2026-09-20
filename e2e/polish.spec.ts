import { test, expect, type Page } from "@playwright/test";
import { getDictionary } from "../packages/i18n/src";
const web = "http://localhost:3100";
async function login(page: Page, role = "admin") {
  await page.goto("/en/auth/signin");
  await page.locator("input[type=email]").fill(`${role}@phase4.example`);
  await page.locator("input[type=password]").fill("Local-phase4-test-only-2026!");
  await page.locator("button[type=submit]").click();
  await expect(page).toHaveURL(/\/en$/);
}
test("cart, saved draft, confirmation and QR survive real locale navigation", async ({
  page,
  browser,
}) => {
  test.setTimeout(90000);
  await login(page, "manager");
  await page.goto("/en/tables");
  const name = "Polish " + Date.now();
  await page.getByRole("button", { name: "Add table", exact: true }).click();
  await page.getByLabel("Table name or number").fill(name);
  await page.getByRole("button", { name: "Save table", exact: true }).click();
  const card = page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name, exact: true }) });
  await card.getByRole("link", { name: "View QR", exact: true }).click();
  const qr = (await page
    .getByRole("link", { name: "Open menu", exact: true })
    .getAttribute("href"))!;
  const token = qr.split("/").pop()!;
  const guest = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await guest.goto(`${web}/en/q/${token}`);
  await expect(guest.getByText(name, { exact: true })).toBeVisible();
  await expect(guest.locator("[data-ordering-hours]")).toContainText("acceptance");
  await guest.getByRole("link", { name: "Haifa Port Branch", exact: true }).click();
  expect(new URL(guest.url()).searchParams.get("table")).toBe(token);
  await guest
    .locator("article")
    .first()
    .getByRole("button", { name: "Add to cart", exact: true })
    .click();
  await guest.getByRole("dialog").locator("button[type=submit]").click();
  await guest.getByRole("link", { name: "العربية", exact: true }).click();
  await guest
    .getByRole("button", { name: getDictionary("ar").ordering.review, exact: true })
    .click();
  await expect(guest.getByRole("dialog").locator("article")).toHaveCount(1);
  await guest.getByRole("dialog").locator("input[autocomplete=name]").fill("Polish guest");
  await guest
    .getByRole("button", { name: getDictionary("ar").ordering.saveDraft, exact: true })
    .click();
  await expect(guest).toHaveURL(/order=/);
  const id = new URL(guest.url()).searchParams.get("order")!;
  await guest
    .getByRole("dialog")
    .getByRole("button", { name: getDictionary("ar").ordering.continue, exact: true })
    .click();
  await guest.getByRole("link", { name: "עברית", exact: true }).click();
  await guest
    .getByRole("button", { name: getDictionary("he").ordering.review, exact: true })
    .click();
  await expect(guest.getByRole("dialog").locator("input[autocomplete=name]")).toHaveValue(
    "Polish guest",
  );
  await guest.getByRole("dialog").locator("button[type=submit]").click();
  await guest.getByRole("dialog").locator("button[type=submit]").click();
  await expect(guest.getByRole("dialog")).toHaveCount(0);
  await guest.getByRole("link", { name: "English", exact: true }).click();
  await expect(
    guest.getByRole("heading", { name: "Your order has been sent", exact: true }),
  ).toBeVisible();
  expect(new URL(guest.url()).searchParams.get("order")).toBe(id);
  expect(new URL(guest.url()).searchParams.get("table")).toBe(token);
  await expect(guest.getByText(name, { exact: true })).toBeVisible();
  await page.goto("/en/tables");
  page.once("dialog", (d) => d.accept());
  await card.getByRole("button", { name: "Revoke QR", exact: true }).click();
  await expect(card.getByRole("link", { name: "View QR" })).toHaveCount(0);
  await guest.reload();
  await expect(
    guest.getByRole("heading", { name: "This table link is unavailable", exact: true }),
  ).toBeVisible();
  await guest.close();
});
test("managed branding permissions reject editors, foreign paths and invalid files", async ({
  page,
}) => {
  await login(page, "editor");
  let res = await page.request.post("/api/appearance-media", {
    headers: { origin: "http://localhost:3101" },
    multipart: { businessId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", kind: "logo" },
  });
  expect(res.status()).toBe(403);
  expect(
    (
      await page.request.get(
        "/api/appearance-media?path=bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.webp",
      )
    ).status(),
  ).toBe(404);
  await login(page);
  res = await page.request.post("/api/appearance-media", {
    headers: { origin: "http://localhost:3101" },
    multipart: { businessId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", kind: "logo" },
  });
  expect(res.status()).toBe(403);
  res = await page.request.post("/api/appearance-media", {
    headers: { origin: "http://localhost:3101" },
    multipart: {
      businessId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      kind: "logo",
      image: { name: "bad.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg/>") },
    },
  });
  expect(res.status()).toBe(400);
});

for (const locale of ["en", "ar", "he"] as const) {
  test(`${locale} password visibility preserves input without submitting`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/${locale}/auth/signin`);
    const A = getDictionary(locale).auth;
    const password = page.locator("#signin-password");
    await password.fill("visibility-check-only");
    await expect(password).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: A.showPassword, exact: true }).click();
    await expect(password).toHaveAttribute("type", "text");
    await expect(password).toHaveValue("visibility-check-only");
    await page.getByRole("button", { name: A.hidePassword, exact: true }).click();
    await expect(password).toHaveAttribute("type", "password");
    await expect(password).toHaveAttribute("autocomplete", "current-password");
    await expect(page).toHaveURL(new RegExp(`/${locale}/auth/signin$`));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}
