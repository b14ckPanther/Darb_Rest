import { test, expect, type Page } from "@playwright/test";
import type { KitchenOrder } from "../packages/types/src/kitchen";
const location = "c1111111-1111-1111-1111-111111111111";
const business = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
async function login(page: Page, role = "staff") {
  await page.goto("http://localhost:3101/en/auth/signin");
  await page.locator("input[type=email]").fill(`${role}@phase4.example`);
  await page.locator("input[type=password]").fill("Local-phase4-test-only-2026!");
  await page.locator("button[type=submit]").click();
  await expect(page).toHaveURL(/\/en$/);
}
const order = (id: string, mode: "dine_in" | "takeaway" = "dine_in"): KitchenOrder => ({
  id,
  business_id: business,
  location_id: location,
  status: "submitted",
  revision: 1,
  submitted_at: new Date(Date.now() - 120000).toISOString(),
  customer_name: "Kitchen guest",
  fulfillment_mode: mode,
  table_name: mode === "dine_in" ? "12" : null,
  table_area: null,
  cancellation_reason: null,
  items: [
    {
      id: "line",
      quantity: 2,
      name: { en: "Latte", ar: "لاتيه", he: "לאטה" },
      variant: { en: "Large", ar: "كبير", he: "גדול" },
      modifiers: [
        {
          name: { en: "Oat", ar: "شوفان", he: "שיבולת שועל" },
          group: { en: "Milk", ar: "حليب", he: "חלב" },
        },
      ],
    },
  ],
});
// Transport fixtures verify client behavior only; the separate real test requires migration 8.
for (const locale of ["en", "ar", "he"])
  test(`${locale} kitchen client responsive details and polling recovery`, async ({ page }) => {
    await login(page);
    let rows = [order("e8400000-0000-4000-8000-000000000001")];
    let fail = false;
    await page.route("**/api/kitchen?**", (route) =>
      fail
        ? route.fulfill({ status: 503, json: { ok: false, error: "save_error" } })
        : route.fulfill({
            json: {
              ok: true,
              feed: { orders: rows, total: rows.length, incoming_revision: rows.length },
            },
          }),
    );
    await page.routeWebSocket("**/realtime/**", (ws) => ws.close());
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`http://localhost:3101/${locale}/kitchen?location=${location}`);
    await expect(page.locator("[data-order-id]")).toHaveCount(1);
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "en" ? "ltr" : "rtl");
    for (const width of [375, 834, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      if (width >= 1024)
        await expect
          .poll(() =>
            page.locator("main").evaluate((el) => {
              const r = el.getBoundingClientRect();
              return document.documentElement.dir === "rtl"
                ? r.right <= innerWidth - 239
                : r.left >= 239;
            }),
          )
          .toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: `.tmp/ui-qa/phase8/kitchen-${locale}-${width}.png`,
        fullPage: true,
      });
    }
    await page.locator("[data-order-id]").getByRole("button").last().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog")).toContainText("12");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
    rows = [
      ...rows,
      order("e8400000-0000-4000-8000-000000000002", "takeaway"),
      { ...order("e8400000-0000-4000-8000-000000000003"), location_id: "other" },
    ];
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await expect(page.locator("[data-order-id]")).toHaveCount(2);
    await expect(page.locator("[data-order-id]").last()).not.toContainText("12");
    fail = true;
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await expect(
      page.locator("[data-order-id]").first().getByRole("button").first(),
    ).toBeDisabled();
    fail = false;
    await page.evaluate(() => window.dispatchEvent(new Event("online")));
    await expect(page.locator("[data-order-id]").first().getByRole("button").first()).toBeEnabled();
  });
test("kitchen real database feed, live arrival and staff operations", async ({ page, browser }) => {
  test.setTimeout(60000);
  let signals = 0;
  let authenticatedJoin = false;
  page.on("websocket", (ws) => {
    if (!ws.url().includes("/realtime/")) return;
    ws.on("framesent", (frame) => {
      const raw = JSON.parse(String(frame.payload));
      if (raw[3] === "phx_join" && raw[4].access_token) {
        const claims = JSON.parse(
          Buffer.from(raw[4].access_token.split(".")[1], "base64url").toString(),
        );
        authenticatedJoin = claims.role === "authenticated";
      }
    });
    ws.on("framereceived", (frame) => {
      const raw = JSON.parse(String(frame.payload));
      if (raw[3] === "postgres_changes" && raw[4].data.record.location_id === location) signals++;
    });
  });
  await login(page);
  await page.goto(`http://localhost:3101/en/kitchen?location=${location}`);
  const result = await page.request.get(`/api/kitchen?location=${location}&status=active&offset=0`);
  expect(result.status(), "Operator must apply migration 8 before real KDS validation").toBe(200);
  const json = await result.json();
  expect(json.ok).toBe(true);
  for (const o of json.feed.orders) {
    expect(o.business_id).toBe(business);
    expect(o.location_id).toBe(location);
    expect(o).not.toHaveProperty("guest_token_hash");
  }
  const other = await page.request.get(
    "/api/kitchen?location=c3333333-3333-3333-3333-333333333333",
  );
  expect(other.status()).toBe(403);
  await expect(page.getByText("Live updates", { exact: true })).toBeVisible();
  expect(authenticatedJoin).toBe(true);
  const initialSignals = signals;
  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  const name = "Kitchen integration " + Date.now();
  await guest.goto("http://localhost:3100/en/order/darb-bistro/haifa-port");
  await guest.locator("article").first().getByRole("button").click();
  await guest.getByRole("dialog").locator("button[type=submit]").click();
  await guest.getByRole("button", { name: "Review order", exact: true }).click();
  const review = guest.getByRole("dialog");
  await review.locator("input[autocomplete=name]").fill(name);
  await review.locator("button[type=submit]").click();
  await review.getByRole("button", { name: "Confirm order", exact: true }).click();
  await expect(guest.getByRole("heading", { name: "Your order has been sent" })).toBeVisible();
  const ticket = page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name, exact: true }) });
  await expect.poll(() => signals, { timeout: 15000 }).toBeGreaterThan(initialSignals);
  // Repeated local runs retain prior orders; the oldest-first feed is paginated.
  async function findTicket() {
    for (let i = 0; i < 100 && !(await ticket.count()); i++) {
      const next = page.getByRole("button", { name: "Next", exact: true });
      if (!(await next.isEnabled())) break;
      const [response] = await Promise.all([
        page.waitForResponse(
          (r) =>
            r.url().includes("/api/kitchen?") &&
            r.request().method() === "GET" &&
            new URL(r.url()).searchParams.get("offset") === String((i + 1) * 50),
        ),
        next.click(),
      ]);
      const payload = await response.json();
      const first = payload.feed?.orders?.[0];
      if (first) await expect(page.locator(`[data-order-id="${first.id}"]`)).toBeVisible();
    }
    await expect(ticket).toBeVisible();
  }
  await findTicket();
  for (const label of ["Accept", "Start preparing", "Mark ready", "Complete"])
    await ticket.getByRole("button", { name: label, exact: true }).click();
  await expect(ticket).toHaveCount(0);
  const [completedResponse] = await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes("/api/kitchen?") && r.url().includes("status=completed"),
    ),
    page.getByRole("button", { name: "Completed", exact: true }).click(),
  ]);
  const completedFeed = await completedResponse.json();
  await expect(page.locator(`[data-order-id="${completedFeed.feed.orders[0].id}"]`)).toBeVisible();
  await findTicket();
  await expect(ticket.getByRole("button", { name: "Accept", exact: true })).toHaveCount(0);
  await guestContext.close();
});
test("read-only cannot open kitchen or read its API", async ({ page }) => {
  await login(page, "reader");
  await page.goto(`http://localhost:3101/en/kitchen?location=${location}`);
  await expect(page.locator("p[role=alert]")).toContainText("unavailable");
  expect((await page.request.get(`/api/kitchen?location=${location}`)).status()).toBe(403);
});

test("kitchen realtime signal refresh and reconnect catch-up (transport fixture)", async ({
  page,
}) => {
  test.setTimeout(60000);
  await login(page);
  let rows = [order("e8500000-0000-4000-8000-000000000001")];
  let reads = 0;
  let joins = 0;
  let send: ((businessId: string, locationId: string) => void) | undefined;
  let disconnect: (() => void) | undefined;
  await page.route("**/api/kitchen?**", (route) => {
    reads++;
    return route.fulfill({
      json: {
        ok: true,
        feed: { orders: rows, total: rows.length, incoming_revision: rows.length },
      },
    });
  });
  await page.routeWebSocket("**/realtime/**", (socket) => {
    // The installed Realtime serializer uses Phoenix v2 five-element arrays.
    const ws = {
      close: () => socket.close(),
      onMessage: (fn: (raw: string) => void) =>
        socket.onMessage((raw) => {
          const [join_ref, ref, topic, event, payload] = JSON.parse(String(raw));
          fn(JSON.stringify({ join_ref, ref, topic, event, payload }));
        }),
      send: (raw: string) => {
        const m = JSON.parse(raw);
        socket.send(
          JSON.stringify([m.join_ref ?? null, m.ref ?? null, m.topic, m.event, m.payload]),
        );
      },
    };
    disconnect = () => ws.close();
    ws.onMessage((raw) => {
      const msg = JSON.parse(String(raw));
      if (msg.event === "phx_join") {
        joins++;
        ws.send(
          JSON.stringify({
            topic: msg.topic,
            event: "phx_reply",
            ref: msg.ref,
            join_ref: msg.join_ref,
            payload: {
              status: "ok",
              response: {
                postgres_changes: msg.payload.config.postgres_changes.map((f: object) => ({
                  ...f,
                  id: 1,
                })),
              },
            },
          }),
        );
        send = (b, l) =>
          ws.send(
            JSON.stringify({
              topic: msg.topic,
              event: "postgres_changes",
              payload: {
                ids: [1],
                data: {
                  schema: "public",
                  table: "kitchen_signals",
                  type: "UPDATE",
                  commit_timestamp: new Date().toISOString(),
                  columns: [],
                  record: { business_id: b, location_id: l, revision: 2 },
                  old_record: {},
                  errors: null,
                },
              },
            }),
          );
      } else if (msg.event === "heartbeat")
        ws.send(
          JSON.stringify({
            topic: msg.topic,
            event: "phx_reply",
            ref: msg.ref,
            payload: { status: "ok", response: {} },
          }),
        );
    });
  });
  await page.goto(`http://localhost:3101/en/kitchen?location=${location}`);
  await expect(page.getByText("Live updates", { exact: true })).toBeVisible();
  await expect.poll(() => reads).toBeGreaterThanOrEqual(2);
  rows.push(order("e8500000-0000-4000-8000-000000000002"));
  send!(business, location);
  await expect(page.locator("[data-order-id]")).toHaveCount(2);
  await expect(page.getByText(/New orders received/)).toBeVisible();
  rows.push(order("e8500000-0000-4000-8000-000000000003", "takeaway"));
  disconnect!();
  await expect.poll(() => joins, { timeout: 20000 }).toBeGreaterThan(1);
  await expect(page.locator("[data-order-id]")).toHaveCount(3);
});
