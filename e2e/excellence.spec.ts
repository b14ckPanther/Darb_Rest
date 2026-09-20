import { test, expect } from "@playwright/test";
import { getDictionary } from "../packages/i18n/src";
import { TEMPLATE_CATALOG } from "../packages/types/src/template-catalog";
for (const locale of ["en", "ar", "he"] as const) {
  test(`${locale} bounded composition, brand differentiation and cart preservation`, async ({
    page,
  }) => {
    test.setTimeout(120000);
    await page.goto("/en/auth/signin");
    await page.locator("input[type=email]").fill("admin@phase4.example");
    await page.locator("input[type=password]").fill("Local-phase4-test-only-2026!");
    await page.locator("button[type=submit]").click();
    await expect(page).toHaveURL(/\/en$/);
    await page.goto(`/${locale}/appearance/templates`);
    const L = getDictionary(locale).appearance,
      O = getDictionary(locale).ordering;
    await page.getByRole("button", { name: L.desktop, exact: true }).click();
    await expect(page.getByRole("button", { name: L.desktop, exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const frame = page.frameLocator("iframe");
    await page.route("https://test-assets.invalid/cover.png", (route) =>
      route.fulfill({
        contentType: "image/png",
        body: Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aO9sAAAAASUVORK5CYII=",
          "base64",
        ),
      }),
    );
    await page.locator('[data-template-choice="signature"]').click();
    const cover = page.getByLabel(L.cover, { exact: true });
    await cover.locator("..").locator("..").locator("summary").click();
    await cover.fill("https://test-assets.invalid/cover.png");
    await page.getByLabel(L.layout_focal, { exact: true }).selectOption("top");
    await expect(frame.locator(".rt-cover img")).toHaveCSS("object-position", "50% 15%");
    await expect
      .poll(() =>
        frame.locator(".rt-cover img").evaluate((img) => (img as HTMLImageElement).naturalWidth),
      )
      .toBeGreaterThan(0);

    await page.getByLabel(L.layout_information, { exact: true }).selectOption("after");
    await page.getByLabel(L.layout_footer, { exact: true }).selectOption("contact");
    await page.getByLabel(L.layout_cta, { exact: true }).selectOption("outline");
    await page.getByRole("button", { name: L.paletteClay, exact: true }).click();
    const firstColor = await frame
      .locator("[data-template]")
      .evaluate((el) => getComputedStyle(el).getPropertyValue("--rt-primary"));
    const ids = await frame.locator(".rt-section").evaluateAll((els) => els.map((el) => el.id));
    await frame
      .locator("article")
      .first()
      .getByRole("button", { name: O.add, exact: true })
      .click();
    await frame.getByRole("dialog").locator("button[type=submit]").click();
    for (const template of TEMPLATE_CATALOG) {
      await page.locator(`[data-template-choice="${template.id}"]`).click();
      await expect(frame.locator("[data-template]")).toHaveAttribute("data-template", template.id);
      await expect(frame.locator("[data-template]")).toHaveAttribute("data-focal", "top");
      expect(
        await frame.locator(".rt-section").evaluateAll((els) => els.map((el) => el.id)),
      ).toEqual(ids);
      for (const device of ["mobile", "tablet", "desktop"] as const) {
        await page.getByRole("button", { name: L[device], exact: true }).click();
        await expect
          .poll(() => frame.locator("html").evaluate((el) => el.scrollWidth <= innerWidth))
          .toBe(true);
      }
      await expect(frame.locator("html")).toHaveAttribute("dir", locale === "en" ? "ltr" : "rtl");
      await frame.getByRole("button", { name: O.review, exact: true }).click();
      await expect(frame.getByRole("dialog").locator("article")).toHaveCount(1);
      await frame
        .getByRole("dialog")
        .getByRole("button", { name: O.continue, exact: true })
        .click();
    }
    await page.locator('[data-template-choice="signature"]').click();
    await page.getByRole("button", { name: L.paletteInk, exact: true }).click();
    await page.getByLabel(L.layout_cards, { exact: true }).selectOption("square");
    await expect(frame.locator("[data-template]")).toHaveAttribute("data-cards", "square");
    await expect
      .poll(() =>
        frame
          .locator("[data-template]")
          .evaluate((el) => getComputedStyle(el).getPropertyValue("--rt-primary")),
      )
      .not.toBe(firstColor);
    expect(await frame.locator(".rt-section").evaluateAll((els) => els.map((el) => el.id))).toEqual(
      ids,
    );
    await page.route("https://test-assets.invalid/missing.png", (route) =>
      route.fulfill({ status: 404 }),
    );
    if (!(await cover.isVisible()))
      await cover.locator("..").locator("..").locator("summary").click();
    await cover.fill("https://test-assets.invalid/missing.png");
    await expect(frame.locator(".rt-cover img")).toHaveAttribute("data-failed", "true");
    await expect(frame.locator(".rt-cover img")).toHaveCSS("visibility", "hidden");
    await page.setViewportSize({ width: 430, height: 932 });
    await page.getByRole("link", { name: L.previewJump, exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `.tmp/ui-qa/10x-editor-${locale}.png`, fullPage: true });
  });
}
