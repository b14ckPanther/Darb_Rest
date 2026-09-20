import { expect, type Page } from "@playwright/test";
import { createRequire } from "node:module";
const web = "http://localhost:3100";
export async function checkManagedBranding(page: Page) {
  await page.goto("/en/appearance/templates");
  await page.getByRole("button", { name: "Desktop", exact: true }).click();
  await expect(page.getByRole("button", { name: "Desktop", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const require = createRequire(new URL("../apps/admin/package.json", import.meta.url));
  const sharp = require("sharp");
  const bytes = await sharp({
    create: { width: 1600, height: 1200, channels: 3, background: "#325d41" },
  })
    .png()
    .toBuffer();
  for (const field of ["logo", "cover"] as const) {
    await page
      .getByLabel(field === "logo" ? "Upload logo" : "Upload cover image", { exact: true })
      .setInputFiles({ name: "brand.png", mimeType: "image/png", buffer: bytes });
    await expect(
      page.getByRole("status").filter({ hasText: "Image ready in your draft" }),
      "Managed branding upload succeeds",
    ).toBeVisible();
  }
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Draft saved. Your public page is unchanged." }),
  ).toBeVisible();
  const paths: string[] = [];
  for (const label of ["Logo URL", "Cover image URL"]) {
    const ref = await page.getByLabel(label, { exact: true }).inputValue();
    paths.push(ref.replace("https://media.darb.invalid/branding/", ""));
  }
  async function checkPublic(status: number) {
    for (const path of paths) {
      const response = await page.request.get(
        `${web}/restaurant-media?path=${encodeURIComponent(path)}`,
      );
      expect(response.status()).toBe(status);
      if (status === 200) {
        expect(response.headers()["content-type"]).toBe("image/webp");
        const small = await page.request.get(
          `${web}/restaurant-media?path=${encodeURIComponent(path)}&width=480`,
        );
        expect(small.status()).toBe(200);
        const metadata = await sharp(await small.body()).metadata();
        expect(metadata.width).toBeLessThanOrEqual(480);
        expect(metadata.format).toBe("webp");
      }
    }
  }
  for (const path of paths) {
    expect(
      (await page.request.get(`/api/appearance-media?path=${encodeURIComponent(path)}`)).status(),
    ).toBe(200);
  }
  await checkPublic(404);
  await page.getByRole("button", { name: "Publish changes", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Published. Your restaurant page is updated." }),
  ).toBeVisible();
  await checkPublic(200);
  for (const field of ["Upload logo", "Upload cover image"]) {
    await page
      .getByLabel(field, { exact: true })
      .setInputFiles({ name: "replacement.png", mimeType: "image/png", buffer: bytes });
    await expect(
      page.getByRole("status").filter({ hasText: "Image ready in your draft" }),
    ).toBeVisible();
  }
  for (const label of ["Logo URL", "Cover image URL"]) {
    const ref = await page.getByLabel(label, { exact: true }).inputValue();
    const replacement = ref.replace("https://media.darb.invalid/branding/", "");
    expect(paths).not.toContain(replacement);
    expect(
      (
        await page.request.get(`${web}/restaurant-media?path=${encodeURIComponent(replacement)}`)
      ).status(),
    ).toBe(404);
  }
  await checkPublic(200);
  await page.getByRole("button", { name: "Remove logo from draft", exact: true }).click();
  await page.getByRole("button", { name: "Remove cover from draft", exact: true }).click();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Draft saved. Your public page is unchanged." }),
  ).toBeVisible();
  await checkPublic(200);
  await page.getByRole("button", { name: "Publish changes", exact: true }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Published. Your restaurant page is updated." }),
  ).toBeVisible();
  await checkPublic(404);
}
