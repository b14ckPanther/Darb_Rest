import { test, expect } from "@playwright/test";
import { commercialLabels } from "../packages/i18n/src/commercial";
for (const locale of ["en", "ar", "he"] as const) {
  test(`${locale} pricing motion preserves values, layout and reduced-motion access`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`http://localhost:3100/${locale}/pricing`);
    const root = page.locator("[data-billing]");
    const L = commercialLabels[locale];
    await expect(root.locator("[data-amount]").first()).toBeVisible();
    const monthly = await root.locator("[data-amount]").allTextContents();
    const before = await root.locator("[data-plan]").first().boundingBox();
    await root.getByRole("button", { name: L.yearly, exact: true }).click();
    await expect(root).toHaveAttribute("data-billing", "yearly");
    expect(await root.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBeGreaterThan(
      0,
    );
    await root.evaluate(async (el) => {
      await Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => {})));
    });
    const yearly = await root.locator("[data-amount]").allTextContents();
    expect(yearly).not.toEqual(monthly);
    const after = await root.locator("[data-plan]").first().boundingBox();
    expect(Math.abs(after!.height - before!.height)).toBeLessThan(1);
    for (const width of [375, 390, 430, 834, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
    await page.setViewportSize({ width: locale === "en" ? 1440 : 390, height: 1000 });
    await root.getByRole("button", { name: L.monthly, exact: true }).click();
    await root.evaluate((el) =>
      el.getAnimations({ subtree: true }).forEach((a) => {
        a.pause();
        a.currentTime = 190;
      }),
    );
    await page.screenshot({
      path: `.tmp/ui-qa/plans-motion/${locale}-transition.png`,
      fullPage: true,
    });
    await root.evaluate((el) => el.getAnimations({ subtree: true }).forEach((a) => a.finish()));
    // Repeated input must settle on the latest choice with no leftover outgoing faces.
    await root.getByRole("button", { name: L.yearly, exact: true }).click();
    await root.getByRole("button", { name: L.monthly, exact: true }).click();
    await root.getByRole("button", { name: L.yearly, exact: true }).click();
    await root.evaluate(async (el) => {
      await Promise.all(el.getAnimations({ subtree: true }).map((a) => a.finished.catch(() => {})));
    });
    expect(await root.locator("[data-amount]").allTextContents()).toEqual(yearly);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await root.getByRole("button", { name: L.monthly, exact: true }).click();
    expect(await root.locator("[data-amount]").allTextContents()).toEqual(monthly);
    expect(await root.evaluate((el) => el.getAnimations({ subtree: true }).length)).toBe(0);
    await page.screenshot({
      path: `.tmp/ui-qa/plans-motion/${locale}-settled.png`,
      fullPage: true,
    });
  });
}
