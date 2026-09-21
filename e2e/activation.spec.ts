import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { randomUUID, randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
test.use({ trace: "off", screenshot: "off", video: "off" });
test("commercial approval, payment, existing account activation and private account settings", async ({
  browser,
}) => {
  test.setTimeout(180000);
  const config = JSON.parse(
    execFileSync("supabase", ["status", "-o", "json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }),
  );
  expect(config.API_URL).toMatch(/^http:\/\/(127\.0\.0\.1|localhost):/);
  const api = async (path: string, method = "GET", body?: object) => {
    const r = await fetch(`${config.API_URL}/${path}`, {
      method,
      headers: {
        apikey: config.SERVICE_ROLE_KEY,
        Authorization: `Bearer ${config.SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!r.ok) throw Error(`Local QA request ${path.split("?")[0]} failed: ${r.status}`);
    const t = await r.text();
    return t ? JSON.parse(t) : null;
  };
  const suffix = randomUUID(),
    password = randomBytes(24).toString("base64url"),
    email = `activation-${suffix}@qa.example`;
  const operator = await api("auth/v1/admin/users", "POST", {
    email: `operator-${suffix}@qa.example`,
    password,
    email_confirm: true,
  });
  const customer = await api("auth/v1/admin/users", "POST", {
    email,
    password,
    email_confirm: true,
  });
  await api("rest/v1/platform_admins", "POST", { user_id: operator.id });
  const application = randomUUID();
  await api("rest/v1/restaurant_applications", "POST", {
    id: application,
    kind: "application",
    full_name: "Activation QA",
    business_name: `Activation ${suffix}`,
    email,
    phone: "+972500000001",
    city: "QA",
    business_type: "restaurant",
    branch_count: 1,
    requested_plan_code: "pro",
    message: "",
    locale: "en",
  });
  const adminContext = await browser.newContext(),
    admin = await adminContext.newPage();
  const login = async (page: typeof admin, address: string) => {
    await page.goto("http://localhost:3101/en/auth/signin");
    await page.locator("input[type=email]").fill(address);
    await page.locator("input[type=password]").fill(password);
    await page.locator("button[type=submit]").click();
    await expect(page).not.toHaveURL(/signin/);
  };
  try {
    await login(admin, operator.email);
    await admin.goto(`http://localhost:3101/en/platform/applications/${application}`);
    const approval = admin.locator("form").filter({ has: admin.locator("input[value=approve]") });
    await approval.locator("select[name=cycle]").selectOption("yearly");
    const plans = await api("rest/v1/plans?code=eq.pro&select=id,yearly_price_ils");
    await expect(approval.locator("input[name=amount]")).toHaveValue(
      String(plans[0].yearly_price_ils),
    );
    const agreed = Number(plans[0].yearly_price_ils) - 1;
    await approval.locator("input[name=amount]").fill(String(agreed));
    await approval.locator("input[type=checkbox]").check();
    await approval.getByRole("button").click();
    await expect(admin).toHaveURL(/result=unavailable/);
    const agreements = await api(`rest/v1/customer_agreements?application_id=eq.${application}`);
    expect(agreements).toHaveLength(1);
    expect(Number(agreements[0].agreed_amount_ils)).toBe(agreed);
    expect(agreements[0].payment_reference).toMatch(/^DR-\d+$/);
    const confirmation = admin
      .locator("form")
      .filter({ has: admin.locator("input[value=confirm]") });
    await confirmation.locator("input[type=checkbox]").check();
    await confirmation.getByRole("button").click();
    await expect(admin).toHaveURL(/result=saved/);
    await admin.getByRole("button", { name: "Send account invitation", exact: true }).click();
    await expect(admin).toHaveURL(/result=unavailable/);
    const states = await api(`rest/v1/customer_activations?agreement_id=eq.${agreements[0].id}`);
    expect(states[0].user_id).toBe(customer.id);
    expect(states[0].invite_state).toBe("existing_account");
    for (const locale of ["en", "ar", "he"])
      for (const width of [390, 834, 1440]) {
        await admin.setViewportSize({ width, height: width === 390 ? 844 : 1100 });
        await admin.goto(`http://localhost:3101/${locale}/platform/applications/${application}`);
        await expect(admin.locator("main h1")).toBeVisible();
        expect(await admin.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
          true,
        );
        mkdirSync(".tmp/activation-qa", { recursive: true });
        await admin.screenshot({
          path: `.tmp/activation-qa/${locale}-${width}.png`,
          fullPage: true,
        });
      }
    await admin.goto("http://localhost:3101/en/platform/billing");
    await expect(admin.getByRole("heading", { name: "Billing settings" })).toBeVisible();
    const customerContext = await browser.newContext(),
      page = await customerContext.newPage();
    await login(page, email);
    await page.goto("http://localhost:3101/en/platform/billing");
    await expect(page.getByRole("heading", { name: "Billing settings" })).toHaveCount(0);
    await page.goto("http://localhost:3101/en/auth/accept-invite");
    await page.getByRole("button", { name: "Activate account", exact: true }).click();
    await expect(page).toHaveURL(/\/en\/onboarding$/);
    const activated = await api(`rest/v1/customer_activations?agreement_id=eq.${agreements[0].id}`);
    expect(activated[0].activated_at).toBeTruthy();
    await page.goto("http://localhost:3101/en/account");
    await page.locator("input[name=name]").fill("Private QA Name");
    await page.locator("input[name=phone]").fill("+972500000002");
    await page.locator("select[name=preferred]").selectOption("he");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page).toHaveURL(/result=saved/);
    const profiles = await api(`rest/v1/profiles?id=eq.${customer.id}`);
    expect(profiles[0].phone).toBe("+972500000002");
    expect(profiles[0].preferred_locale).toBe("he");
    for (const locale of ["en", "ar", "he"] as const) {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(`http://localhost:3101/${locale}/account`);
      await expect(page.locator("html")).toHaveAttribute("dir", locale === "en" ? "ltr" : "rtl");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: `.tmp/activation-qa/account-${locale}-390.png`,
        fullPage: true,
      });
    }
    await page.goto("http://localhost:3101/en/account");
    const changedPassword = randomBytes(24).toString("base64url");
    await page.locator("input[name=password]").fill(changedPassword);
    await page.locator("input[name=confirmPassword]").fill(changedPassword);
    await Promise.all([
      page.waitForResponse(
        (response) => response.request().method() === "POST" && response.url().includes("/account"),
      ),
      page.getByRole("button", { name: "Update password", exact: true }).click(),
    ]);
    await expect(page).toHaveURL(/result=saved/);
    const signedIn = await api("auth/v1/token?grant_type=password", "POST", {
      email,
      password: changedPassword,
    });
    expect(signedIn.user.id).toBe(customer.id);
    await customerContext.close();
  } finally {
    await adminContext.close(); /* Immutable commercial records remain as clearly named local QA history. */
  }
});

test("new Auth invitation, customer-chosen password, invalid links and email-change request", async ({
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
  const api = async (
    path: string,
    method = "GET",
    body?: object,
    token = config.SERVICE_ROLE_KEY,
  ) => {
    const r = await fetch(`${config.API_URL}/${path}`, {
      method,
      headers: {
        apikey: config.SERVICE_ROLE_KEY,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!r.ok) throw Error(`Local activation fixture failed ${path.split("?")[0]} ${r.status}`);
    const t = await r.text();
    return t ? JSON.parse(t) : null;
  };
  const key = randomUUID(),
    password = randomBytes(24).toString("base64url"),
    email = `invite-${key}@qa.example`;
  const operator = await api("auth/v1/admin/users", "POST", {
    email: `invite-operator-${key}@qa.example`,
    password,
    email_confirm: true,
  });
  await api("rest/v1/platform_admins", "POST", { user_id: operator.id });
  const session = await api("auth/v1/token?grant_type=password", "POST", {
    email: operator.email,
    password,
  });
  const app = randomUUID();
  await api("rest/v1/restaurant_applications", "POST", {
    id: app,
    kind: "application",
    full_name: "Invite QA",
    business_name: "Invite QA",
    email,
    phone: "+972500000001",
    city: "QA",
    business_type: "cafe",
    branch_count: 1,
    locale: "he",
  });
  const plans = await api("rest/v1/plans?code=eq.starter&select=id,monthly_price_ils");
  const agreement = await api(
    "rest/v1/rpc/approve_customer_application",
    "POST",
    { p_application: app, p_plan: plans[0].id, p_cycle: "monthly" },
    session.access_token,
  );
  const payment = await api(`rest/v1/manual_customer_payments?agreement_id=eq.${agreement}`);
  await api(
    "rest/v1/rpc/confirm_customer_payment",
    "POST",
    { p_payment: payment[0].id, p_amount: plans[0].monthly_price_ils, p_method: "bank_transfer" },
    session.access_token,
  );
  const operatorContext = await browser.newContext(),
    admin = await operatorContext.newPage();
  await admin.goto("http://localhost:3101/en/auth/signin");
  await admin.locator("input[type=email]").fill(operator.email);
  await admin.locator("input[type=password]").fill(password);
  await admin.locator("button[type=submit]").click();
  await expect(admin).not.toHaveURL(/signin/);
  await admin.goto(`http://localhost:3101/en/platform/applications/${app}`);
  await admin.getByRole("button", { name: "Send account invitation", exact: true }).click();
  await expect(admin).toHaveURL(/result=saved/);
  const activation = await api(`rest/v1/customer_activations?agreement_id=eq.${agreement}`);
  expect(activation[0].invite_state).toBe("sent");
  expect(activation[0].user_id).toBeTruthy();
  // Generate a local-only equivalent of the emailed token; never inspect or log credentials.
  const link = await api("auth/v1/admin/generate_link", "POST", { type: "invite", email });
  const verified = await api("auth/v1/verify", "POST", {
    token_hash: link.hashed_token,
    type: "invite",
  });
  const customerContext = await browser.newContext({ viewport: { width: 390, height: 844 } }),
    page = await customerContext.newPage();
  await page.goto("http://localhost:3101/he/auth/accept-invite");
  await expect(page.locator("input[name=password]")).toHaveCount(0);
  await page.goto(
    `http://localhost:3101/he/auth/accept-invite#access_token=${encodeURIComponent(verified.access_token)}&refresh_token=${encodeURIComponent(verified.refresh_token)}&type=invite`,
  );
  await expect(page.locator("input[name=password]")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  mkdirSync(".tmp/activation-qa", { recursive: true });
  await page.screenshot({ path: ".tmp/activation-qa/invite-he-390.png", fullPage: true });
  await page.locator("input[name=password]").fill(password);
  await page.locator("input[name=confirmPassword]").fill(password);
  await page.locator("form button[type=submit],form button:not([type])").last().click();
  await expect(page).toHaveURL(/\/he\/onboarding$/);
  await page.goto("http://localhost:3101/en/account");
  await page.locator("input[name=email]").fill(`changed-${key}@qa.example`);
  await page.getByRole("button", { name: "Request email change" }).click();
  await expect(page).toHaveURL(/result=pendingEmail/);
  const user = await api(`auth/v1/admin/users/${activation[0].user_id}`);
  expect(user.email).toBe(email);
  expect(user.new_email).toBe(`changed-${key}@qa.example`);
  await customerContext.close();
  await operatorContext.close();
});
