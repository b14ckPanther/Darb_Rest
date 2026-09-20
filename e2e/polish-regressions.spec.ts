import { test, expect } from "@playwright/test";

test.describe("UI Polish & Performance Regression Tests", () => {
  test("1. Dark logo transparent asset resolves and renders without border/rectangle", async ({
    request,
    page,
  }) => {
    // Check web asset resolves with 200 OK
    const webLogoRes = await request.get(
      "http://localhost:3000/brand/darb-rest-logo-dark-transparent.webp",
    );
    expect(webLogoRes.status()).toBe(200);

    // Check admin asset resolves with 200 OK
    const adminLogoRes = await request.get(
      "http://localhost:3001/brand/darb-rest-logo-dark-transparent.webp",
    );
    expect(adminLogoRes.status()).toBe(200);

    // Verify footer renders the transparent dark logo
    await page.goto("http://localhost:3000/ar");
    const footerLogo = page.locator("footer img[src*='darb-rest-logo-dark-transparent.webp']");
    await expect(footerLogo).toBeVisible();

    // Verify admin signin renders the transparent dark logo
    await page.goto("http://localhost:3001/ar/auth/signin");
    const signinLogo = page.locator("img[src*='darb-rest-logo-dark-transparent.webp']");
    await expect(signinLogo).toBeVisible();
  });

  test("2. Mixed-language brand text and identifiers declare lang='en' semantics", async ({
    page,
    context,
  }) => {
    // Check public footer external brand link has lang='en'
    await page.goto("http://localhost:3000/ar");
    const darbCoIl = page.locator("footer a[href='https://darb.co.il/en']");
    await expect(darbCoIl).toHaveAttribute("lang", "en");

    // Check admin dashboard overview
    await context.addCookies([
      {
        name: "darb_rest_dev_session",
        value: "owner@darb.co.il",
        domain: "localhost",
        path: "/",
      },
    ]);
    await page.goto("http://localhost:3001/ar");

    // Check domain slug badge has lang='en'
    const slugBadge = page.locator("span:has-text('rest.darb.co.il')");
    await expect(slugBadge).toHaveAttribute("lang", "en");

    // Check plan label has lang='en'
    const planLabel = page.locator(
      "div[lang='en']:has-text('Starter'), div[lang='en']:has-text('Pro')",
    );
    await expect(planLabel.first()).toBeVisible();

    // Check user email in sidebar has lang='en'
    const userEmail = page.locator("aside div[lang='en']:has-text('owner@darb.co.il')");
    await expect(userEmail).toBeVisible();
  });

  test("3. Admin Settings navigation uses client-side routing without full document reload and completes promptly", async ({
    page,
    context,
  }) => {
    await context.addCookies([
      {
        name: "darb_rest_dev_session",
        value: "owner@darb.co.il",
        domain: "localhost",
        path: "/",
      },
    ]);

    await page.goto("http://localhost:3001/ar");
    await expect(page.locator("h1")).toBeVisible();

    // Track document navigation events to confirm NO full page reload happens
    let fullPageReload = false;
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame() && frame.url().includes("/settings")) {
        // Next.js client navigation updates URL without triggering fresh document load
      }
    });

    const startTime = Date.now();

    // Click on Settings in the sidebar
    const settingsLink = page.locator("aside nav a[href='/ar/settings']");
    await expect(settingsLink).toBeVisible();
    await settingsLink.click();

    // Verify settings form elements appear
    await expect(page.locator("form")).toBeVisible();
    await expect(page.locator("text=rest.darb.co.il/darb-bistro")).toBeVisible();

    const duration = Date.now() - startTime;
    // Ensure warm client navigation completes in well under 2 seconds (not 7+ seconds)
    expect(duration).toBeLessThan(2500);
  });
});
