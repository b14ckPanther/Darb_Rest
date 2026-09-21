import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { randomUUID, randomBytes } from "node:crypto";
test.use({ trace: "off", screenshot: "off", video: "off" });
test("real application persistence, duplicate handling, platform review and tenant denial (migration 15)", async ({
  browser,
}) => {
  test.setTimeout(120000);
  const config = JSON.parse(
    execFileSync("supabase", ["status", "-o", "json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }),
  );
  expect(config.API_URL).toMatch(/^http:\/\/(localhost|127\.0\.0\.1):/);
  const headers = {
    apikey: config.SERVICE_ROLE_KEY,
    Authorization: `Bearer ${config.SERVICE_ROLE_KEY}`,
    "Content-Type": "application/json",
  };
  const probe = await fetch(`${config.API_URL}/rest/v1/restaurant_applications?select=id&limit=0`, {
    headers,
  });
  if (!probe.ok) {
    const body = await probe.json();
    test.skip(
      body.code === "PGRST205" || body.code === "42P01",
      "Operator must apply migration 15 before persistence QA",
    );
    throw Error("Application schema probe failed");
  }
  async function api(path: string, method = "GET", body?: object) {
    const response = await fetch(`${config.API_URL}/${path}`, {
      headers,
      method,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) throw Error(`Local acquisition fixture failed (${response.status})`);
    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }
  const email = `acquisition-${randomUUID()}@qa.example`,
    users: string[] = [],
    contexts: Awaited<ReturnType<typeof browser.newContext>>[] = [];
  try {
    const guest = await browser.newContext();
    contexts.push(guest);
    const page = await guest.newPage();
    async function submit() {
      await page.goto("http://localhost:3100/en/get-started?plan=pro");
      for (const [name, value] of Object.entries({
        full_name: "Application QA",
        business_name: "Acquisition QA",
        email,
        phone: "0501234567",
        city: "Nazareth",
      }))
        await page.locator(`[name=${name}]`).fill(value);
      await page.getByRole("button", { name: "Send request", exact: true }).click();
      await expect(page.getByText("Your request is in.", { exact: true })).toBeVisible();
    }
    await submit();
    await submit();
    const rows = await api(`rest/v1/restaurant_applications?email=eq.${encodeURIComponent(email)}`);
    expect(rows).toHaveLength(1);
    expect(rows[0].requested_plan_code).toBe("pro");
    const anon = await fetch(`${config.API_URL}/rest/v1/restaurant_applications?select=id`, {
      headers: { apikey: config.ANON_KEY, Authorization: `Bearer ${config.ANON_KEY}` },
    });
    expect(anon.ok).toBe(false);
    for (const role of ["reviewer", "tenant"]) {
      const password = randomBytes(24).toString("base64url"),
        userEmail = `${role}-${randomUUID()}@qa.example`;
      const user = await api("auth/v1/admin/users", "POST", {
        email: userEmail,
        password,
        email_confirm: true,
      });
      users.push(user.id);
      if (role === "reviewer") await api("rest/v1/platform_admins", "POST", { user_id: user.id });
      else
        await api("rest/v1/memberships", "POST", {
          user_id: user.id,
          business_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
          role: "staff",
          status: "active",
        });
      const context = await browser.newContext();
      contexts.push(context);
      const admin = await context.newPage();
      await admin.goto("http://localhost:3101/en/auth/signin");
      await admin.locator("input[type=email]").fill(userEmail);
      await admin.locator("input[type=password]").fill(password);
      await admin.locator("button[type=submit]").click();
      await expect(admin).not.toHaveURL(/auth\/signin/);
      const response = await admin.goto(
        `http://localhost:3101/en/platform/applications/${rows[0].id}`,
      );
      if (role === "tenant") {
        expect(response?.status()).toBe(404);
        continue;
      }
      await expect(admin.getByRole("heading", { name: "Request details" })).toBeVisible();
      const approval = admin
        .locator("form")
        .filter({ has: admin.locator('input[value="approve"]') });
      await approval.locator('input[name="confirmed"]').check();
      await approval.getByRole("button", { name: "Approve commercial terms", exact: true }).click();
      await expect(admin).toHaveURL(/result=unavailable/);
      const [approved] = await api(`rest/v1/restaurant_applications?id=eq.${rows[0].id}`);
      expect(approved.status).toBe("approved");
      expect(approved.reviewed_by).toBe(user.id);
      await api("rest/v1/rpc/submit_restaurant_application", "POST", {
        p_input: {
          kind: "inquiry",
          full_name: "Inquiry QA",
          business_name: "Inquiry QA",
          email,
          phone: "",
          locale: "en",
          message: "Local inquiry QA",
        },
      });
      const [inquiry] = await api(
        `rest/v1/restaurant_applications?email=eq.${encodeURIComponent(email)}&kind=eq.inquiry`,
      );
      await admin.goto(`http://localhost:3101/en/platform/applications/${inquiry.id}`);
      await admin.getByRole("button", { name: "Reject", exact: true }).click();
      await expect(admin).toHaveURL(/result=(saved|unavailable)/);
      const [rejected] = await api(`rest/v1/restaurant_applications?id=eq.${inquiry.id}`);
      expect(rejected.status).toBe("rejected");
      await admin.goto(
        `http://localhost:3101/en/platform/applications?q=${encodeURIComponent(email)}`,
      );
      await expect(admin.getByText("Acquisition QA", { exact: true })).toBeVisible();
    }
  } finally {
    for (const c of contexts) await c.close();
    // Immutable commercial agreements and their actors remain as named local QA history.
    // A database reset is operator-controlled; tests never disable immutability triggers.
  }
});
