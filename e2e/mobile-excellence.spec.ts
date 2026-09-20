import { test, expect } from "@playwright/test";
const viewports = [
  [375, 812],
  [390, 844],
  [393, 852],
  [430, 932],
  [768, 1024],
  [834, 1194],
];
for (const locale of ["en", "ar", "he"]) {
  test(`${locale} mobile hero and sign-in retain above-fold actions`, async ({ page }) => {
    test.setTimeout(90000);
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const [width, height] of viewports) {
      await page.setViewportSize({ width: width!, height: height! });
      await page.goto(`http://localhost:3000/${locale}`);
      const actions = page.locator(".marketing-hero .hero-animate-delay-3 > a");
      await expect(actions).toHaveCount(2);
      for (const action of await actions.all()) {
        await expect(action).toBeVisible();
        const box = await action.boundingBox();
        expect(box!.y + box!.height).toBeLessThanOrEqual(height!);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.goto(`http://localhost:3001/${locale}/auth/signin`);
      for (const selector of [
        ".signin-topbar img",
        ".signin-card h1",
        "#signin-email",
        "#signin-password",
        ".signin-card button[type=submit]",
      ]) {
        const element = page.locator(selector);
        await expect(element).toBeVisible();
        const box = await element.boundingBox();
        expect(box!.y + box!.height).toBeLessThanOrEqual(height!);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.locator("#signin-password").fill("visibility-check");
      await page.locator('button[aria-controls="signin-password"]').click();
      await expect(page.locator("#signin-password")).toHaveAttribute("type", "text");
      await expect(page.locator("#signin-password")).toHaveValue("visibility-check");
      expect(
        await page
          .locator("#signin-email")
          .evaluate((e) => parseFloat(getComputedStyle(e).fontSize)),
      ).toBeGreaterThanOrEqual(16);
      await page.setViewportSize({ width: width!, height: 480 });
      await page.locator("#signin-password").focus();
      await page.locator(".signin-card button[type=submit]").scrollIntoViewIfNeeded();
      await expect(page.locator(".signin-card button[type=submit]")).toBeInViewport();
    }
  });
}
