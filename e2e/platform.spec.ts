import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { randomBytes, randomUUID } from "node:crypto";
// Generated local credentials remain only in memory; no traces or sign-in screenshots.
test.use({ trace: "off", screenshot: "off", video: "off" });
test("platform privileges, zero memberships, tenant switching and normal account boundaries", async ({
  browser,
}) => {
  test.setTimeout(120000);
  const config = JSON.parse(
    execFileSync("supabase", ["status", "-o", "json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }),
  );
  expect(config.API_URL).toMatch(/^http:\/\/(127\.0\.0\.1|localhost):/);
  const headers = {
    apikey: config.SERVICE_ROLE_KEY,
    Authorization: `Bearer ${config.SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
  };
  async function api(path: string, method = "GET", body?: object) {
    const r = await fetch(`${config.API_URL}/${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!r.ok) throw Error(`Local fixture operation failed (${r.status})`);
    const text = await r.text();
    return text ? JSON.parse(text) : null;
  }
  const users: string[] = [];
  const businessId = randomUUID();
  try {
    await api("rest/v1/businesses", "POST", {
      id: businessId,
      name: { en: "Platform controls QA" },
      slug: `platform-qa-${businessId}`,
      business_type: "restaurant",
      status: "active",
    });
    for (const kind of ["platform", "dual", "owner", "staff", "ordinary"]) {
      const email = `platform-${kind}-${randomBytes(6).toString("hex")}@qa.example`,
        password = randomBytes(24).toString("base64url");
      const user = await api("auth/v1/admin/users", "POST", {
        email,
        password,
        email_confirm: true,
      });
      users.push(user.id);
      if (kind === "platform" || kind === "dual")
        await api("rest/v1/platform_admins", "POST", { user_id: user.id });
      if (["dual", "owner", "staff"].includes(kind))
        await api("rest/v1/memberships", "POST", {
          user_id: user.id,
          business_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          role: kind === "owner" ? "owner" : "staff",
          status: "active",
        });
      const context = await browser.newContext(),
        page = await context.newPage();
      const layoutWarnings: string[] = [];
      page.on("console", (message) => {
        if (/has either width or height modified|data-scroll-behavior/.test(message.text()))
          layoutWarnings.push(message.text());
      });
      await page.goto("http://localhost:3101/en/auth/signin");
      expect(
        await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior),
      ).toBe("auto");

      await page.locator("input[type=email]").fill(email);
      await page.locator("input[type=password]").fill(password);
      await page.locator("button[type=submit]").click();
      await expect(page).not.toHaveURL(/auth\/signin/);
      if (kind === "platform" || kind === "dual") {
        if (kind === "platform") await expect(page).toHaveURL(/\/en\/platform$/);
        else {
          await expect(page).toHaveURL(/\/en$/);
          await expect(
            page.getByRole("link", { name: "Platform Administration", exact: true }),
          ).toBeVisible();
        }
        for (const locale of ["en", "ar", "he"])
          for (const [width, height] of [
            [390, 844],
            [834, 1194],
            [1440, 1000],
          ]) {
            await page.setViewportSize({ width, height });
            await page.goto(`http://localhost:3101/${locale}/platform`);
            await expect(page.locator("main h1")).toBeVisible();
            await expect(page.locator("header")).toContainText(email);
            if (kind === "platform") {
              mkdirSync(".tmp/platform-qa", { recursive: true });
              await page.screenshot({
                path: `.tmp/platform-qa/${locale}-${width}.png`,
                fullPage: true,
              });
            }
            expect(
              await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
            ).toBe(true);
            if (locale === "en") {
              await expect(page.locator("header")).toContainText("Platform Admin");
              await expect(page.locator("header")).not.toContainText("Staff");
            }
          }
        await page.goto("http://localhost:3101/en/platform/businesses?q=darb-bistro");
        await expect(
          page
            .getByRole("link")
            .filter({ has: page.getByRole("heading", { name: "Darb Bistro", exact: true }) }),
        ).toBeVisible();
        await page.goto(
          "http://localhost:3101/en/platform/businesses/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        );
        await expect(page.getByRole("heading", { name: "Darb Bistro", exact: true })).toBeVisible();
        await expect(
          page.getByRole("button", { name: "Suspend business", exact: true }),
        ).toBeVisible();
        if (kind === "platform") {
          await page.goto(`http://localhost:3101/en/platform/businesses/${businessId}`);
          const operation = page
            .locator("form")
            .filter({ has: page.getByRole("button", { name: "Suspend business", exact: true }) });
          await operation.locator("input[name=confirm]").check();
          await operation.getByRole("button", { name: "Suspend business", exact: true }).click();
          await expect(page).toHaveURL(/result=saved/);
          expect(
            (await api(`rest/v1/businesses?id=eq.${businessId}&select=status`))[0].status,
          ).toBe("suspended");
          await operation.locator("input[name=confirm]").check();
          await operation.getByRole("button", { name: "Activate business", exact: true }).click();
          await expect
            .poll(
              async () =>
                (await api(`rest/v1/businesses?id=eq.${businessId}&select=status`))[0].status,
            )
            .toBe("active");
          // Wait for the refreshed action result before editing another form.
          // A database write can complete before the redirect has committed in the browser.
          await expect(page.locator("main dd").filter({ hasText: /^Active$/ })).toBeVisible();
          const override = page.locator("form").filter({ has: page.locator("input[name=reason]") });
          await override.locator("input[name=limit]").fill("3");
          await override.locator("input[name=reason]").fill("Local platform control verification");
          await override.locator("input[name=enabled]").check();
          await override.locator("input[name=confirm]").check();
          await override.locator("button").click();
          await expect
            .poll(
              async () =>
                (
                  await api(
                    `rest/v1/business_feature_overrides?business_id=eq.${businessId}&select=limit_value`,
                  )
                )[0]?.limit_value,
            )
            .toBe(3);
          for (const locale of ["en", "ar", "he"]) {
            await page.setViewportSize({ width: 390, height: 844 });
            await page.goto(`http://localhost:3101/${locale}/platform/businesses/${businessId}`);
            await expect(page.locator("main h1")).toBeVisible();
            expect(
              await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
            ).toBe(true);
            await page.screenshot({
              path: `.tmp/platform-qa/detail-${locale}.png`,
              fullPage: true,
            });
          }
        }
        await page.goto("http://localhost:3101/en/platform/plans");
        await expect(page.locator("main h1")).toHaveText("Plans & features");
        if (kind === "dual") {
          await page.evaluate(() => {
            const state = { missingConsole: false };
            const observer = new MutationObserver(() => {
              if (!document.querySelector("main")) state.missingConsole = true;
            });
            observer.observe(document.body, { childList: true, subtree: true });
            Object.assign(window, { consoleTransition: { state, observer } });
          });
          await page.getByRole("link", { name: "Restaurant console", exact: true }).click();
          await expect(page).toHaveURL(/\/en$/);
          await expect(page.locator("main")).toBeVisible();
          expect(
            await page.evaluate(() => {
              const check = (
                window as unknown as {
                  consoleTransition: {
                    state: { missingConsole: boolean };
                    observer: MutationObserver;
                  };
                }
              ).consoleTransition;
              check.observer.disconnect();
              return check.state.missingConsole;
            }),
          ).toBe(false);
        }
        // A stale signed-in session loses platform access immediately after revocation.
        await api(`rest/v1/platform_admins?user_id=eq.${user.id}`, "DELETE");
        const denied = await page.goto("http://localhost:3101/en/platform");
        expect(
          denied?.status() === 404 ||
            (await denied!.text()).includes("NEXT_HTTP_ERROR_FALLBACK;404"),
        ).toBe(true);
        await expect(page.locator("header").filter({ hasText: "Platform Admin" })).toHaveCount(0);
      } else {
        if (kind === "ordinary") {
          await expect(
            page.getByRole("link", { name: /Register New Business|Create.*Business/i }),
          ).toBeVisible();
        }
        for (const path of [
          "platform",
          "platform/businesses",
          "platform/plans",
          "platform/businesses/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        ]) {
          const result = await page.goto(`http://localhost:3101/en/${path}`);
          expect(
            result?.status() === 404 ||
              (await result!.text()).includes("NEXT_HTTP_ERROR_FALLBACK;404"),
          ).toBe(true);
          await expect(
            page.getByRole("button", { name: "Suspend business", exact: true }),
          ).toHaveCount(0);
        }
      }
      expect(layoutWarnings).toEqual([]);
      await context.close();
    }
    const anonymous = await browser.newPage();
    await anonymous.goto("http://localhost:3101/en/platform");
    await expect(anonymous).toHaveURL(/auth\/signin/);
    await anonymous.close();
  } finally {
    await api(`rest/v1/businesses?id=eq.${businessId}`, "DELETE");
    for (const id of users) {
      await api(`rest/v1/platform_admins?user_id=eq.${id}`, "DELETE");
      await api(`rest/v1/memberships?user_id=eq.${id}`, "DELETE");
      await api(`auth/v1/admin/users/${id}`, "DELETE");
    }
  }
});
