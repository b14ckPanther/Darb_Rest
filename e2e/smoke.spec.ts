import { test, expect } from "@playwright/test";

const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}]/u;

const FORBIDDEN_TECH_LABELS = [
  "Next.js",
  "Tailwind",
  "Multi-Tenant",
  "multi-tenant",
  "App Router",
  "Supabase",
  "Cairo",
  "Heebo",
  "Ubuntu",
  "pnpm",
  "Turbo",
  "RLS",
  "RBAC",
];

test.describe("Darb REST Public Website Tests", () => {
  test("Public Web loads with Arabic default and RTL layout", async ({ page }) => {
    await page.goto("http://localhost:3000/ar");

    // Verify HTML direction and lang attributes
    const html = page.locator("html");
    await expect(html).toHaveAttribute("dir", "rtl");
    await expect(html).toHaveAttribute("lang", "ar");

    // Verify brand elements exist
    await expect(page.locator("header").getByRole("img", { name: "Darb REST" })).toBeVisible();

    // Verify hero headline
    await expect(page.locator("body")).toContainText("تجربة رقمية تليق بمطعمك");

    // Verify absence of forbidden emojis
    const textContent = (await page.locator("body").innerText()) || "";
    expect(EMOJI_REGEX.test(textContent)).toBe(false);
  });

  test("Public Web has no visible tech stack labels", async ({ page }) => {
    await page.goto("http://localhost:3000/en");

    const textContent = (await page.locator("body").innerText()) || "";

    for (const label of FORBIDDEN_TECH_LABELS) {
      expect(textContent).not.toContain(label);
    }
  });

  test("Public Web hero uses responsive image sources", async ({ page }) => {
    await page.goto("http://localhost:3000/ar");

    // Verify picture element with responsive sources exists
    const picture = page.locator("picture");
    await expect(picture).toBeVisible();

    // Check for source elements with different media queries
    const sources = page.locator("picture source");
    const count = await sources.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test("Public Web navigation exists with CTA", async ({ page }) => {
    await page.goto("http://localhost:3000/en");

    // Verify header exists
    await expect(page.locator("header")).toBeVisible();

    // Verify navigation has CTA link
    await expect(page.locator("body")).toContainText("Start with Darb REST");

    // Verify hero CTA exists
    await expect(page.locator("body")).toContainText("Get Started");
  });

  test("Public Web switches to English and toggles LTR direction", async ({ page }) => {
    await page.goto("http://localhost:3000/ar");

    // Click on English language button
    const enButton = page
      .locator("header")
      .getByRole("button", { name: /English/i })
      .filter({ visible: true });
    await enButton.click();

    // Verify URL and direction change
    await expect(page).toHaveURL(/.*\/en/);
    const html = page.locator("html");
    await expect(html).toHaveAttribute("dir", "ltr");
    await expect(html).toHaveAttribute("lang", "en");

    // Verify English hero text
    await expect(page.locator("body")).toContainText(
      "A digital experience worthy of your restaurant",
    );
  });

  test("Public Web switches to Hebrew RTL correctly", async ({ page }) => {
    await page.goto("http://localhost:3000/en");

    // Click on Hebrew language button
    const heButton = page
      .locator("header")
      .getByRole("button", { name: /Hebrew/i })
      .filter({ visible: true });
    await heButton.click();

    // Verify URL and direction change
    await expect(page).toHaveURL(/.*\/he/);
    const html = page.locator("html");
    await expect(html).toHaveAttribute("dir", "rtl");
    await expect(html).toHaveAttribute("lang", "he");

    // Verify Hebrew hero text
    await expect(page.locator("body")).toContainText("חוויה דיגיטלית שראויה למסעדה שלך");
  });

  test("Public Web mobile menu trigger exists at mobile viewport", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("http://localhost:3000/en");

    // Verify mobile menu button is present
    const menuButton = page.getByRole("button", { name: /open menu/i });
    await expect(menuButton).toBeVisible();
    await menuButton.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: /close menu/i })).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(dialog.getByRole("link", { name: "Start with Darb REST" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(menuButton).toBeFocused();
  });

  test("Public Web has no emojis on any locale", async ({ page }) => {
    for (const locale of ["ar", "he", "en"]) {
      await page.goto(`http://localhost:3000/${locale}`);
      const textContent = (await page.locator("body").innerText()) || "";
      expect(EMOJI_REGEX.test(textContent)).toBe(false);
    }
  });

  test("Admin Console unauthenticated request redirects to sign-in page", async ({ page }) => {
    await page.goto("http://localhost:3001/ar");

    // Verify server-side redirect to auth/signin
    await expect(page).toHaveURL(/.*\/ar\/auth\/signin/);
    await expect(page.locator("body")).toContainText("تسجيل الدخول");

    // Verify absence of forbidden emojis
    const textContent = (await page.locator("body").innerText()) || "";
    expect(EMOJI_REGEX.test(textContent)).toBe(false);
  });

  test("Admin Sign-In page loads with test accounts and language switcher", async ({ page }) => {
    await page.goto("http://localhost:3001/ar/auth/signin");

    // Verify presence of sign-in form elements
    await expect(page.locator("input[type='email']")).toBeVisible();
    await expect(page.locator("input[type='password']")).toBeVisible();
    await expect(page.getByRole("button", { name: "تسجيل الدخول" })).toBeVisible();

    // Verify presence of development quick-access accounts
    await expect(page.locator("body")).toContainText("owner@darb.co.il");
    await expect(page.locator("body")).toContainText("haifa-manager@darb.co.il");
    await expect(page.locator("body")).toContainText("newuser@darb.co.il");
  });

  test("Admin Console logs in as Owner and renders business dashboard", async ({ page }) => {
    // Navigate to dev-login as Owner
    await page.goto(
      "http://localhost:3001/auth/dev-login?email=owner%40darb.co.il&redirectUrl=/ar",
    );

    // Verify dashboard loads
    await expect(page).toHaveURL(/.*\/ar/);
    await expect(page.locator("aside")).toBeVisible();

    // Verify business information is rendered
    await expect(page.locator("body")).toContainText("درب بيسترو");
    await expect(page.locator("body")).toContainText("owner@darb.co.il");

    // Verify plan features section (localized)
    await expect(page.locator("body")).toContainText("المنيو الرقمي");

    // Verify no forbidden tech labels in admin
    const adminText = (await page.locator("body").innerText()) || "";
    for (const label of [
      "Multi-Tenant",
      "multi-tenant",
      "Entitlement",
      "Architecture",
      "RLS",
      "RBAC",
    ]) {
      expect(adminText).not.toContain(label);
    }

    // Verify absence of forbidden emojis
    expect(EMOJI_REGEX.test(adminText)).toBe(false);
  });

  test("Admin Console switches to Hebrew and preserves active business session", async ({
    page,
  }) => {
    // Establish authenticated session
    await page.goto(
      "http://localhost:3001/auth/dev-login?email=owner%40darb.co.il&redirectUrl=/ar",
    );

    // Click on Hebrew language button
    const heButton = page.getByRole("button", { name: "עברית" });
    await heButton.click();

    // Verify URL and direction
    await expect(page).toHaveURL(/.*\/he/);
    const html = page.locator("html");
    await expect(html).toHaveAttribute("dir", "rtl");
    await expect(html).toHaveAttribute("lang", "he");

    // Verify Hebrew admin subtitle
    await expect(page.locator("body")).toContainText("ניהול המסעדות, בתי הקפה והסניפים שלך");
  });

  test("Admin Console displays empty state for user without businesses", async ({ page }) => {
    // Navigate as new user without businesses
    await page.goto(
      "http://localhost:3001/auth/dev-login?email=newuser%40darb.co.il&redirectUrl=/ar",
    );

    // Verify no-business empty state
    await expect(page.locator("body")).toContainText("لا يوجد نشاط تجاري مرتبط بهذا الحساب");
    await expect(page.locator("body")).toContainText("تسجيل نشاط تجاري جديد");
  });

  test("Admin Console signs out and redirects to sign-in page", async ({ page }) => {
    // First login
    await page.goto(
      "http://localhost:3001/auth/dev-login?email=owner%40darb.co.il&redirectUrl=/ar",
    );
    await expect(page).toHaveURL(/.*\/ar/);

    // Hit signout route
    await page.goto("http://localhost:3001/auth/signout");

    // Verify redirect to sign-in page
    await expect(page).toHaveURL(/.*\/ar\/auth\/signin/);
  });
});
