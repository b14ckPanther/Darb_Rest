import { chromium } from "@playwright/test";

// Read-only account check: credentials stay in memory; no traces or screenshots.
let browser;
let stage = "environment checks";
try {
  const email = process.env.PLATFORM_QA_EMAIL;
  const password = process.env.PLATFORM_QA_PASSWORD;
  const origin = new URL(process.env.PLATFORM_QA_ADMIN_URL || "");
  if (
    !email ||
    !password ||
    origin.username ||
    origin.password ||
    (origin.protocol !== "https:" &&
      !(origin.protocol === "http:" && ["localhost", "127.0.0.1"].includes(origin.hostname)))
  )
    throw Error("invalid_configuration");
  browser = await chromium.launch();
  const page = await browser.newPage();
  stage = "password sign-in";
  await page.goto(new URL("/en/auth/signin", origin).href);
  await page.locator("input[type=email]").fill(email);
  await page.locator("input[type=password]").fill(password);
  await page.locator("button[type=submit]").click();
  await page.waitForURL((url) => !url.pathname.includes("/auth/signin"));
  for (const locale of ["en", "ar", "he"]) {
    for (const route of ["platform", "platform/businesses", "platform/plans"]) {
      stage = "protected platform pages";
      await page.goto(new URL(`/${locale}/${route}`, origin).href);
      await page.locator("main h1").waitFor();
      if (!(await page.locator("header").innerText()).includes(email))
        throw Error("account_not_visible");
      if (locale === "en" && !(await page.locator("header").innerText()).includes("Platform Admin"))
        throw Error("platform_role_missing");
    }
  }
  console.log("Platform account sign-in and EN/AR/HE protected read-only pages passed.");
} catch {
  console.error(`Platform account check stopped during ${stage}. No credentials were logged.`);
  process.exitCode = 1;
} finally {
  await browser?.close();
}
