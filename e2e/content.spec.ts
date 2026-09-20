import { test, expect, type Page, type Locator } from "@playwright/test";
async function login(page: Page, role = "editor") {
  await page.goto("/en/auth/signin");
  await page.locator("input[type=email]").fill(role + "@phase4.example");
  await page.locator("input[type=password]").fill("Local-phase4-test-only-2026!");
  await page.locator("button[type=submit]").click();
  await expect(page).toHaveURL(/\/en$/);
  await page.goto("/en/menus");
  await expect(page.getByRole("heading", { name: "Menus", exact: true })).toBeVisible();
}
async function name(dialog: Locator, text: string, index = 0) {
  await dialog
    .getByRole("group", { name: "Name", exact: true })
    .nth(index)
    .getByRole("button", { name: /^EN/ })
    .click();
  await dialog.getByRole("textbox", { name: "Name EN", exact: true }).nth(index).fill(text);
}
async function save(dialog: Locator) {
  await dialog.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(dialog).not.toBeVisible();
}
test("real content lifecycle, multilingual choices, media, overrides and preview", async ({
  page,
}) => {
  test.setTimeout(120000);
  page.setDefaultTimeout(10000);
  await login(page);
  const stamp = Date.now();
  const menu = "Test menu " + stamp,
    group = "Sauces " + stamp;
  const dialog = page.getByRole("dialog");
  await page.getByRole("button", { name: "Create modifier group", exact: true }).click();
  await name(dialog, group);
  await dialog.getByRole("button", { name: "Add option" }).click();
  await name(dialog, "Tahini", 1);
  await dialog.getByLabel("Extra price (ILS)", { exact: true }).fill("3");
  await save(dialog);
  await page.getByRole("button", { name: "Create menu", exact: true }).click();
  await name(dialog, menu);
  await dialog.getByRole("checkbox", { name: "All branches", exact: true }).check();
  await save(dialog);
  await page.getByRole("link", { name: menu, exact: true }).click();
  await page.getByRole("button", { name: "Add section", exact: true }).click();
  await name(dialog, "Garden");
  await save(dialog);
  await page.getByRole("button", { name: "Add dish", exact: true }).click();
  await name(dialog, "Garden bowl");
  await dialog
    .getByRole("group", { name: "Name", exact: true })
    .getByRole("button", { name: /^AR/ })
    .click();
  await dialog.getByRole("textbox", { name: "Name AR", exact: true }).fill("طبق الحديقة");
  await dialog
    .getByRole("group", { name: "Name", exact: true })
    .getByRole("button", { name: /^HE/ })
    .click();
  await dialog.getByRole("textbox", { name: "Name HE", exact: true }).fill("קערת גינה");
  await dialog.getByLabel("Price (ILS)", { exact: true }).fill("32.50");
  await dialog.getByRole("button", { name: "Choices & additions", exact: true }).click();
  await dialog.getByRole("button", { name: "Add variant", exact: true }).click();
  await name(dialog, "Large");
  await dialog.getByLabel("Price (ILS)", { exact: true }).fill("42");
  await dialog.getByRole("checkbox", { name: group, exact: true }).check();
  await dialog.getByRole("button", { name: "Dietary information", exact: true }).click();
  await dialog.getByRole("checkbox", { name: "Vegan", exact: true }).check();
  await dialog.getByRole("checkbox", { name: "Sesame", exact: true }).check();
  await save(dialog);
  await expect(page.getByRole("heading", { name: "Garden bowl", exact: true })).toBeVisible();
  await page
    .locator("section")
    .filter({ has: page.getByRole("heading", { name: "Garden", exact: true }) })
    .getByRole("button", { name: "Edit", exact: true })
    .last()
    .click();
  await dialog.getByRole("button", { name: "Branch adjustments", exact: true }).click();
  const branch = dialog
    .locator("fieldset")
    .filter({ has: page.locator("legend", { hasText: "Haifa Port" }) })
    .last();
  await branch.getByLabel("Available", { exact: true }).selectOption("false");
  await dialog.getByRole("button", { name: "Dish image", exact: true }).click();
  const sharp = (await import("node:module")).createRequire(
    process.cwd() + "/apps/admin/package.json",
  )("sharp");
  const png = await sharp({
    create: { width: 320, height: 240, channels: 3, background: "#b7c58a" },
  })
    .png()
    .toBuffer();
  const upload = page.waitForResponse(
    (r) => r.url().endsWith("/api/menu-media") && r.request().method() === "POST",
  );
  await dialog
    .locator("input[type=file]")
    .setInputFiles({ name: "dish.png", mimeType: "image/png", buffer: png });
  expect((await upload).status()).toBe(200);
  await expect(dialog.locator("img")).toBeVisible();
  await save(dialog);
  await page.getByRole("link", { name: "Guest preview", exact: true }).click();
  const dish = page.locator("article").filter({ hasText: "Garden bowl" });
  await expect(dish).toContainText("42.00");
  await expect(dish).toContainText("Currently unavailable");
  await dish.getByText("Dish details", { exact: true }).click();
  await expect(dish).toContainText("Tahini");
  await expect(dish).toContainText("Sesame");
  await expect(dish.locator("img")).toBeVisible();
  await page.getByLabel("Choose branch").selectOption({ label: "Old City Akko Branch" });
  await expect(dish).not.toContainText("Currently unavailable");
  const editorUrl = page.url().replace("/preview", "");
  await page.goto(editorUrl);
  await page.getByRole("button", { name: "Available", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Currently unavailable", exact: true }),
  ).toBeVisible();
  for (const locale of ["ar", "he"]) {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(editorUrl.replace("/en/", "/" + locale + "/"));
    await expect(page.locator("main h1")).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await page.locator("section h3").first().locator("../..").getByRole("button").nth(1).click();
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();
    const tabs = modal.locator("form > fieldset > [role=group]").getByRole("button");
    for (let index = 0; index < 5; index++) {
      await tabs.nth(index).click();
      expect(await modal.evaluate((e) => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
    }
    await page.keyboard.press("Escape");
    await expect(modal).not.toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
});
test("read-only role has preview access without content mutations", async ({ page }) => {
  await login(page, "reader");
  await expect(page.getByRole("button", { name: "Create menu", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Slow mornings", exact: true }).click();
  await expect(page.getByRole("button", { name: "Add dish", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Guest preview", exact: true })).toBeVisible();
});

test("image replacement cleans old objects; removal and permissions are enforced", async ({
  page,
}) => {
  await login(page);
  const itemId = "d2000000-0000-4000-8000-000000000001";
  const sharp = (await import("node:module")).createRequire(
    process.cwd() + "/apps/admin/package.json",
  )("sharp");
  const buffer = await sharp({
    create: { width: 128, height: 128, channels: 3, background: "#617545" },
  })
    .png()
    .toBuffer();
  const headers = { origin: "http://localhost:3101" };
  const multipart = { itemId, image: { name: "test.png", mimeType: "image/png", buffer } };
  const first = await page.request.post("/api/menu-media", { headers, multipart });
  expect(first.status()).toBe(200);
  const original = await first.json();
  const second = await page.request.post("/api/menu-media", { headers, multipart });
  expect(second.status()).toBe(200);
  const replacement = await second.json();
  expect(replacement.path).not.toBe(original.path);
  expect((await page.request.get(original.url)).status()).not.toBe(200);
  expect((await page.request.get(replacement.url)).status()).toBe(200);
  const invalid = await page.request.post("/api/menu-media", {
    headers,
    multipart: {
      itemId,
      image: { name: "bad.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg/>") },
    },
  });
  expect(invalid.status()).toBe(400);
  const removed = await page.request.post("/api/menu-media", {
    headers,
    multipart: { itemId, remove: "true" },
  });
  expect(removed.status()).toBe(200);
  expect((await page.request.get(replacement.url)).status()).not.toBe(200);
  await page.context().clearCookies();
  await login(page, "reader");
  expect((await page.request.post("/api/menu-media", { headers, multipart })).status()).toBe(403);
});
