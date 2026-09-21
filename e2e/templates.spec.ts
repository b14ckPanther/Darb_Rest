import { checkManagedBranding } from "./branding-check";
import { test, expect, type Page } from "@playwright/test";
import { DEFAULT_APPEARANCE } from "../packages/types/src/templates";
import { TEMPLATE_CATALOG } from "../packages/types/src/template-catalog";
import { getDictionary } from "../packages/i18n/src";
async function login(page: Page, role = "admin") {
  await page.goto("/en/auth/signin");
  await page.locator("input[type=email]").fill(`${role}@phase4.example`);
  await page.locator("input[type=password]").fill("Local-phase4-test-only-2026!");
  await page.locator("button[type=submit]").click();
  await expect(page).toHaveURL(/\/en$/);
}
for (const locale of ["en", "ar", "he"] as const)
  test(`${locale} live real-data template preview, read-only preview and responsive layouts`, async ({
    page,
  }) => {
    test.setTimeout(120000);
    await login(page);
    await page.goto(`/${locale}/appearance/templates`);
    const L = getDictionary(locale).appearance,
      O = getDictionary(locale).ordering;
    const frame = page.frameLocator("iframe");
    const visual = await page.context().newPage();
    await visual.goto(`/${locale}/appearance-preview`);

    for (const template of TEMPLATE_CATALOG) {
      await page.locator(`[data-template-choice="${template.id}"]`).click();
      await expect(frame.locator("[data-template]")).toHaveAttribute("data-template", template.id);
      await expect(frame.locator("html")).toHaveAttribute("dir", locale === "en" ? "ltr" : "rtl");
      await expect(frame.locator("article")).not.toHaveCount(0);
      for (const device of ["mobile", "tablet", "desktop"]) {
        await page.getByRole("button", { name: L[device as "mobile"], exact: true }).click();
        await expect
          .poll(() => frame.locator("html").evaluate((el) => el.scrollWidth <= innerWidth))
          .toBe(true);
      }
      await visual.evaluate(
        (settings) => window.postMessage({ type: "darb-appearance", settings }, location.origin),
        { ...DEFAULT_APPEARANCE, template: template.id, density: template.densities[0]! },
      );
      await expect(visual.locator("[data-template]")).toHaveAttribute("data-template", template.id);
      for (const width of [375, 430, 834, 1440]) {
        await visual.setViewportSize({ width, height: 1000 });
        await expect
          .poll(() => visual.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
          .toBe(true);
        await visual.evaluate(() => scrollTo(0, 0));
        await visual.screenshot({
          path: `.tmp/ui-qa/phase10/${template.id}-${locale}-${width}.png`,
          fullPage: true,
        });
      }
      await expect(frame.getByRole("button", { name: O.add, exact: true })).toHaveCount(0);
    }
    await page
      .getByLabel(L.branch, { exact: true })
      .selectOption("c2222222-2222-2222-2222-222222222222");
    await expect(frame.locator("article")).not.toHaveCount(0);
    await visual.close();
  });
test("public canonical slug, branch resolution and private preview authorization", async ({
  page,
}) => {
  await page.goto("http://localhost:3100/darb-bistro");
  await expect(page.locator("[data-template]")).toBeVisible();
  expect(new URL(page.url()).pathname).toBe("/darb-bistro");
  await page.goto("http://localhost:3100/en/darb-bistro?branch=other-business");
  await expect(page.locator("[data-template]")).toHaveCount(0);
  await login(page, "staff");
  await page.goto("/en/appearance/templates");
  await expect(
    page.getByRole("alert").filter({ hasText: getDictionary("en").appearance.unavailable }),
  ).toBeVisible();
  await page.goto("/en/appearance-preview");
  await expect(page.locator("[data-template]")).toHaveCount(0);
});
test("appearance persistence and managed branding (requires migrations 10 and 11)", async ({
  page,
  browser,
}) => {
  test.setTimeout(180000);
  await login(page);
  await page.goto("/en/appearance/templates");
  const L = getDictionary("en").appearance;
  await page.locator('[data-template-choice="editorial"]').click();
  await page.getByRole("button", { name: L.draft, exact: true }).click();
  await expect(page.getByRole("status")).toHaveText(L.saved);
  await page.reload();
  await expect(page.locator('[data-template-choice="editorial"]')).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.getByRole("button", { name: L.publish, exact: true }).click();
  await expect(page.getByRole("status")).toHaveText(L.published);
  const guest = await browser.newPage();
  await guest.goto("http://localhost:3100/en/darb-bistro");
  await expect(guest.locator("[data-template]")).toHaveAttribute("data-template", "editorial");
  await page.locator('[data-template-choice="night"]').click();
  await page.getByRole("button", { name: L.draft, exact: true }).click();
  await expect(page.getByRole("status")).toHaveText(L.saved);
  await guest.reload();
  await expect(guest.locator("[data-template]")).toHaveAttribute("data-template", "editorial");
  // Exercise published presentations through the real guest route, not preview transport.
  for (const template of TEMPLATE_CATALOG) {
    await page.locator(`[data-template-choice="${template.id}"]`).click();
    await page.getByRole("button", { name: L.publish, exact: true }).click();
    await expect(page.getByRole("status")).toHaveText(L.published);
    for (const locale of ["en", "ar", "he"] as const) {
      for (const branch of ["haifa-port", "akko-old-city"]) {
        await guest.setViewportSize({ width: 390, height: 844 });
        await guest.goto(`http://localhost:3100/${locale}/darb-bistro?branch=${branch}`);
        await expect(guest.locator("[data-template]")).toHaveAttribute(
          "data-template",
          template.id,
        );
        await expect(guest.locator("html")).toHaveAttribute("dir", locale === "en" ? "ltr" : "rtl");
        await expect(guest.locator("article")).not.toHaveCount(0);
        expect(await guest.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        await expect(
          guest.getByRole("button", { name: /Continue to checkout|Confirm order/ }),
        ).toHaveCount(0);
      }
    }
  }
  // Leave the local demonstration business on the default template.
  await page.locator('[data-template-choice="signature"]').click();
  await page.getByRole("button", { name: L.publish, exact: true }).click();
  await expect(page.getByRole("status")).toHaveText(L.published);
  await guest.close();
  await checkManagedBranding(page);
  // New appearance-only options must persist independently of operational records.
  await page.getByLabel(L.layout_focal, { exact: true }).selectOption("top");
  await page.getByLabel(L.layout_information, { exact: true }).selectOption("after");
  await page.getByRole("button", { name: L.draft, exact: true }).click();
  await expect(
    page.getByRole("status"),
    "Composition persistence requires operator-applied migration 12",
  ).toHaveText(L.saved);
  await page.reload();
  await expect(page.getByLabel(L.layout_focal, { exact: true })).toHaveValue("top");
  await page.getByRole("button", { name: L.publish, exact: true }).click();
  await expect(page.getByRole("status")).toHaveText(L.published);
  const composed = await browser.newPage();
  await composed.goto("http://localhost:3100/en/darb-bistro");
  await expect(composed.locator("[data-template]")).toHaveAttribute("data-focal", "top");
  await expect(composed.locator("[data-template]")).toHaveAttribute("data-information", "after");
  await composed.close();
  await page.getByLabel(L.layout_focal, { exact: true }).selectOption("center");
  await page.getByLabel(L.layout_information, { exact: true }).selectOption("before");
  await page.getByRole("button", { name: L.publish, exact: true }).click();
  await expect(page.getByRole("status")).toHaveText(L.published);
});
