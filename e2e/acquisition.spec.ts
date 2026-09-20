import { test, expect } from "@playwright/test";

for (const locale of ["en", "ar", "he"]) {
  test(`acquisition CTAs, plan preselection and mobile ${locale}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`http://localhost:3000/${locale}`);
    await expect(
      page
        .locator("main")
        .getByRole("link")
        .filter({ has: page.locator("span") })
        .first(),
    ).toHaveAttribute("href", `/${locale}/get-started`);
    expect(
      await page.locator(`a[href="/${locale}/get-started"]`).first().getAttribute("target"),
    ).toBeNull();
    expect(await page.locator(`a[href$="/${locale}/auth/signin"]`).count()).toBeGreaterThan(0);
    await page.goto(`http://localhost:3000/${locale}/pricing`);
    for (const plan of ["starter", "pro", "enterprise"])
      await expect(page.locator(`a[href="/${locale}/get-started?plan=${plan}"]`)).toBeVisible();
    await page.locator(`a[href="/${locale}/get-started?plan=pro"]`).click();
    await expect(page.locator("select[name=requested_plan_code]")).toHaveValue("pro");
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "en" ? "ltr" : "rtl");
    for (const width of [375, 390, 393, 430, 768, 834, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await expect(page.locator("input[name=email]")).toBeVisible();
    }
    await page.goto(`http://localhost:3000/${locale}/contact`);
    await expect(page.locator("textarea[name=message]")).toHaveAttribute("required", "");
    await expect(page.locator("select[name=requested_plan_code]")).toHaveCount(0);
  });
}
