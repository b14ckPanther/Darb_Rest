import { test, expect } from "@playwright/test";
for (const locale of ["en", "ar", "he"])
  test(`${locale} restaurant metadata and structured data use clean published URLs`, async ({
    page,
  }) => {
    await page.goto(`http://localhost:3100/${locale}/darb-bistro?branch=haifa-port`);
    await expect(page.locator("link[rel=canonical]")).toHaveAttribute(
      "href",
      new RegExp(`/${locale}/darb-bistro\\?branch=haifa-port$`),
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute("content", /.+/);
    const data = JSON.parse(
      (await page.locator('script[type="application/ld+json"]').textContent()) ?? "null",
    );
    expect(data["@type"]).toBe("Restaurant");
    expect(data.url).not.toContain("table=");
    expect(data.url).not.toContain("order=");
    await page.goto(`http://localhost:3100/${locale}/darb-bistro?branch=haifa-port&table=invalid`);
    await expect(page.locator("meta[name=robots]")).toHaveAttribute("content", /noindex/);
  });
test("robots and published sitemap require launch migration 14", async ({ request }) => {
  const robots = await request.get("http://localhost:3100/robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain("order=");
  const map = await request.get("http://localhost:3100/sitemap.xml");
  expect(map.status(), "Operator must apply migration 14").toBe(200);
  expect(await map.text()).toContain("/en/darb-bistro");
  expect(await map.text()).not.toContain("table=");
});
test("launch controls require migration 14 and owner-level permission", async ({ page }) => {
  await page.goto("/en/auth/signin");
  await page.locator("input[type=email]").fill("admin@phase4.example");
  await page.locator("input[type=password]").fill("Local-phase4-test-only-2026!");
  await page.locator("button[type=submit]").click();
  await expect(page).toHaveURL(/\/en$/);
  await page.goto("/en/launch");
  await expect(
    page.locator("input[name=hostname]"),
    "Operator must apply migration 14",
  ).toBeVisible();
});
test("untrusted hostname fails closed and forwarded headers cannot choose a tenant", async ({
  request,
}) => {
  const unknown = await request.get("http://localhost:3100/en/darb-bistro", {
    headers: { host: "unknown.restaurant-example.org" },
  });
  expect([404, 503]).toContain(unknown.status());
  expect(await unknown.text()).not.toContain("Darb Bistro");
  const forged = await request.get("http://localhost:3100/en/darb-bistro", {
    headers: {
      "x-forwarded-host": "unknown.restaurant-example.org",
      "x-darb-tenant": "another-business",
    },
  });
  expect(forged.status()).toBe(200);
  expect(await forged.text()).toContain("Darb Bistro");
});
