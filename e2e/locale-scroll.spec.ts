import { expect, test } from "@playwright/test";

for (const viewport of [
  { width: 390, height: 844 },
  { width: 834, height: 1194 },
  { width: 1440, height: 900 },
]) {
  test(`homepage language switching preserves reading position at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await page.goto("http://localhost:3000/en?source=locale-qa");
    await page.evaluate(() => document.fonts.ready);

    for (const selector of ["main section", "#product", "#plans", "#footer"]) {
      const section = page.locator(selector).first();
      await section.evaluate((element) => element.scrollIntoView({ behavior: "instant" }));
      const initialOffset = await section.evaluate(
        (element) => element.getBoundingClientRect().top,
      );
      for (const [locale, name] of [
        ["ar", "Arabic"],
        ["he", "Hebrew"],
        ["en", "English"],
        ["ar", "Arabic"],
      ]) {
        await page
          .locator("header")
          .getByRole("button", { name: `Switch language to ${name}`, exact: true })
          .filter({ visible: true })
          .click();
        await expect(page.locator("html")).toHaveAttribute("lang", locale!);
        await expect(page.locator("html")).toHaveAttribute("dir", locale === "en" ? "ltr" : "rtl");
        await expect(page).toHaveURL(new RegExp(`/${locale}\\?source=locale-qa$`));
        await expect
          .poll(async () =>
            Math.abs(
              (await section.evaluate((element) => element.getBoundingClientRect().top)) -
                initialOffset,
            ),
          )
          .toBeLessThan(3);
      }
    }

    // The footer switcher also preserves position, including same-language clicks.
    await page.evaluate(() =>
      window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }),
    );
    await page
      .locator("footer")
      .getByRole("button", { name: "Switch language to English", exact: true })
      .click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    const y = await page.evaluate(() => window.scrollY);
    await page
      .locator("footer")
      .getByRole("button", { name: "Switch language to English", exact: true })
      .click();
    expect(await page.evaluate(() => window.scrollY)).toBe(y);
    await expect(page.locator("footer")).toBeInViewport();
  });
}

test("language switching retains the hash without scrolling back to a stale anchor", async ({
  page,
}) => {
  await page.goto("http://localhost:3000/en?source=locale-qa#product");
  await page.evaluate(() => document.fonts.ready);
  await expect
    .poll(async () =>
      Math.abs(
        (await page
          .locator("#product")
          .evaluate((element) => element.getBoundingClientRect().top)) - 80,
      ),
    )
    .toBeLessThan(3);
  await page
    .locator("#plans")
    .evaluate((element) => element.scrollIntoView({ behavior: "instant" }));
  const offset = await page
    .locator("#plans")
    .evaluate((element) => element.getBoundingClientRect().top);
  await page
    .locator("header")
    .getByRole("button", { name: "Switch language to Hebrew", exact: true })
    .filter({ visible: true })
    .click();
  await expect(page).toHaveURL("http://localhost:3000/he?source=locale-qa#product");
  await expect
    .poll(async () =>
      Math.abs(
        (await page.locator("#plans").evaluate((element) => element.getBoundingClientRect().top)) -
          offset,
      ),
    )
    .toBeLessThan(3);
});
