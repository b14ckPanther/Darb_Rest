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
test("dormant operations are unavailable through routes and APIs", async ({ page }) => {
  await login(page, "manager");
  for (const route of ["orders", "tables", "kitchen", "operations", "analytics"]) {
    const r = await page.goto(`/en/${route}`);
    expect(r?.status()).toBe(404);
  }
  for (const route of ["kitchen", "operations", "analytics"]) {
    expect((await page.request.get(`/api/${route}`)).status()).toBe(404);
  }
  expect(
    (await page.request.post(`${web}/api/payments/webhooks/local-test`, { data: {} })).status(),
  ).toBe(404);
  await page.goto(`${web}/en/q/invalid`);
  await expect(page.locator("h1")).toHaveText(getDictionary("en").tables.invalidQr);
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
