import { test, expect, type Page } from "@playwright/test";
import { getDictionary } from "../packages/i18n/src";
import type { OperationsContext, KitchenOrder } from "../packages/types/src";
const location = "c1111111-1111-1111-1111-111111111111",
  business = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  station = "e9100000-0000-4000-8000-000000000001",
  user = "e9000000-0000-4000-8000-000000000001";
async function login(page: Page) {
  await page.goto("http://localhost:3101/en/auth/signin");
  await page.locator("input[type=email]").fill("manager@phase4.example");
  await page.locator("input[type=password]").fill("Local-phase4-test-only-2026!");
  await page.locator("button[type=submit]").click();
  await expect(page).toHaveURL(/\/en$/);
}
const ctx: OperationsContext = {
  manager: true,
  user_id: user,
  stations: [{ id: station, name: "Grill", is_active: true, revision: 1 }],
  routes: [{ id: "route", station_id: station, item_id: "item", section_id: null }],
  tables: [{ id: "table", name: "12", state: "occupied", assigned_user_id: user, revision: 1 }],
  staff: [{ user_id: user, name: "Operations manager", role: "manager", in_branch: true }],
  catalog: [
    {
      id: "item",
      kind: "item",
      name: { en: "Grilled vegetables", ar: "خضار مشوية", he: "ירקות צלויים" },
    },
  ],
  preferences: { new_orders: true, ready_orders: true },
  history_total: 1,
  history: [
    {
      id: "history",
      actor_id: user,
      action: "table_state",
      target_id: "table",
      payload: { state: "occupied" },
      created_at: "2026-09-19T10:00:00Z",
    },
  ],
  printer_events: [
    {
      id: "event",
      order_id: "order",
      kind: "submitted",
      version: 1,
      created_at: "2026-09-19T10:00:00Z",
    },
  ],
};
const ticket: KitchenOrder = {
  id: "e9200000-0000-4000-8000-000000000001",
  business_id: business,
  location_id: location,
  status: "preparing",
  revision: 3,
  submitted_at: new Date().toISOString(),
  accepted_at: new Date().toISOString(),
  prep_started_at: new Date().toISOString(),
  customer_name: "Operations guest",
  fulfillment_mode: "dine_in",
  table_name: "12",
  table_area: "Terrace",
  cancellation_reason: null,
  is_rush: true,
  assigned_user_id: user,
  items: [
    {
      id: "item",
      quantity: 2,
      name: { en: "Grilled vegetables", ar: "خضار مشوية", he: "ירקות צלויים" },
      variant: null,
      modifiers: [],
      tasks: [
        { id: "task", station_id: station, station_name: "Grill", state: "pending", revision: 1 },
      ],
    },
  ],
};
for (const locale of ["en", "ar", "he"] as const)
  test(`${locale} operations transport fixture: station filters, tables, staff, history and RTL`, async ({
    page,
  }) => {
    await login(page);
    const L = getDictionary(locale).operations;
    let query = "";
    await page.route("**/api/operations?**", (route) => {
      const url = new URL(route.request().url());
      if (url.searchParams.get("view") === "orders") {
        query = url.search;
        return route.fulfill({
          json: {
            ok: true,
            feed: { orders: [ticket], total: 1, incoming_revision: 1, ready_revision: 0 },
          },
        });
      }
      return route.fulfill({ json: { ok: true, context: ctx } });
    });
    await page.goto(`http://localhost:3101/${locale}/operations?location=${location}`);
    await expect(page.locator("[data-order-id]")).toHaveCount(1);
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "en" ? "ltr" : "rtl");
    await page.getByLabel(L.stations, { exact: true }).selectOption(station);
    await expect.poll(() => query).toContain(`station=${station}`);
    await page.getByLabel(L.mine, { exact: true }).check();
    await expect.poll(() => query).toContain("mine=true");
    await page.locator("summary").filter({ hasText: L.management }).click();
    await expect(page.getByRole("heading", { name: L.history, exact: true })).toBeVisible();
    await expect(page.getByText(L.printerNote, { exact: true })).toBeVisible();
    for (const width of [375, 430, 834, 1440]) {
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
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
        .toBe(true);
      await page.screenshot({
        path: `.tmp/ui-qa/phase9/setup-${locale}-${width}.png`,
        fullPage: true,
      });
    }
    await page.locator("summary").filter({ hasText: L.management }).click();
    await page.setViewportSize({ width: 375, height: 1000 });
    await expect
      .poll(() => page.locator("main").evaluate((el) => el.getBoundingClientRect().width))
      .toBe(375);
    await page.screenshot({ path: `.tmp/ui-qa/phase9/station-${locale}-375.png`, fullPage: true });
    await expect(
      page.locator("[data-order-id]").getByRole("button", { name: L.rush, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  });
test("operations real database context and branch isolation", async ({ page, browser }) => {
  test.setTimeout(90000);
  await login(page);
  const result = await page.request.get(`/api/operations?location=${location}`);
  expect(result.status(), "Operator must apply migration 9 before real operations validation").toBe(
    200,
  );
  expect((await result.json()).context.manager).toBe(true);
  const other = await page.request.get(
    "/api/operations?location=c3333333-3333-3333-3333-333333333333",
  );
  expect(other.status()).toBe(403);
  const L = getDictionary("en").operations;
  const name = `E2E station ${Date.now()}`;
  await page.goto(`/en/operations?location=${location}`);
  await page.locator("summary").filter({ hasText: L.management }).click();
  const create = page
    .locator("form")
    .filter({ has: page.getByLabel(L.newStation, { exact: true }) });
  await create.getByRole("textbox").fill(name);
  await create.getByRole("button", { name: L.save, exact: true }).click();
  await expect
    .poll(async () => {
      const r = await page.request.get(`/api/operations?location=${location}`);
      const body = await r.json();
      return body.context?.stations.some((s: { name: string }) => s.name === name);
    })
    .toBe(true);
  const settings = (await (await page.request.get(`/api/operations?location=${location}`)).json())
    .context as OperationsContext;
  const createdStation = settings.stations.find((s) => s.name === name)!;
  await page
    .getByLabel(L.item, { exact: true })
    .selectOption("d2000000-0000-4000-8000-000000000001");
  await page.getByLabel(L.routingStation, { exact: true }).selectOption(createdStation.id);
  await page.getByRole("button", { name: L.enable, exact: true }).click();
  await expect
    .poll(async () => {
      const context = (
        await (await page.request.get(`/api/operations?location=${location}`)).json()
      ).context as OperationsContext;
      return context.routes.some((r) => r.station_id === createdStation.id);
    })
    .toBe(true);
  await page.getByLabel(L.stations, { exact: true }).selectOption(createdStation.id);
  const guestContext = await browser.newContext();
  const guest = await guestContext.newPage();
  const customer = `Operations guest ${Date.now()}`;
  await guest.goto("http://localhost:3100/en/order/darb-bistro/haifa-port");
  await guest
    .locator("article")
    .filter({ hasText: /Labneh/ })
    .first()
    .getByRole("button")
    .click();
  await guest.getByRole("dialog").locator("button[type=submit]").click();
  await guest.getByRole("button", { name: "Review order", exact: true }).click();
  const review = guest.getByRole("dialog");
  await review.locator("input[autocomplete=name]").fill(customer);
  await review.locator("button[type=submit]").click();
  await review.getByRole("button", { name: "Confirm order", exact: true }).click();
  await expect(guest.getByRole("heading", { name: "Your order has been sent" })).toBeVisible();
  const ticket = page.locator("[data-order-id]").filter({ hasText: customer });
  await expect(ticket).toBeVisible();
  await ticket.getByRole("button", { name: L.normal, exact: true }).click();
  await expect(ticket.getByRole("button", { name: L.rush, exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await ticket.getByRole("button", { name: "Accept", exact: true }).click();
  await ticket.getByRole("button", { name: "Start preparing", exact: true }).click();
  await ticket.getByRole("button", { name: L.preparing, exact: true }).click();
  await ticket.getByRole("button", { name: L.ready, exact: true }).click();
  await expect(ticket.getByRole("button", { name: L.ready, exact: true })).toHaveCount(0);
  const orderId = await ticket.getAttribute("data-order-id");
  const actual = (await (await page.request.get(`/api/operations?location=${location}`)).json())
    .context as OperationsContext;
  expect(actual.printer_events.some((e) => e.order_id === orderId && e.kind === "submitted")).toBe(
    true,
  );
  expect(actual.history.some((e) => e.target_id === orderId && e.action === "rush")).toBe(true);
  await guestContext.close();
  for (const locale of ["en", "ar", "he"] as const) {
    const copy = getDictionary(locale).operations;
    await page.goto(`/${locale}/operations?location=${location}`);
    await page.getByLabel(copy.stations, { exact: true }).selectOption(createdStation.id);
    await expect(page.locator("html")).toHaveAttribute("dir", locale === "en" ? "ltr" : "rtl");
    await expect(page.locator("[data-order-id]").filter({ hasText: customer })).toBeVisible();
    for (const width of [375, 430, 834, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await expect
        .poll(() => page.locator("main").evaluate((el) => el.getBoundingClientRect().width))
        .toBe(width < 1024 ? width : width - 240);
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
        .toBe(true);
      await page.screenshot({
        path: `.tmp/ui-qa/phase9/live-${locale}-${width}.png`,
        fullPage: true,
      });
    }
    await page.locator("summary").filter({ hasText: copy.management }).click();
    await expect(page.getByRole("heading", { name: copy.history, exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: copy.printers, exact: true })).toBeVisible();
    await page.screenshot({ path: `.tmp/ui-qa/phase9/live-setup-${locale}.png`, fullPage: true });
  }
  await page.goto(`/en/operations?location=${location}`);
  await page.getByLabel(L.stations, { exact: true }).selectOption(createdStation.id);
  await ticket.getByRole("button", { name: "Mark ready", exact: true }).click();
  await ticket.getByRole("button", { name: "Complete", exact: true }).click();
  await page.locator("summary").filter({ hasText: L.management }).click();
  const edit = page.locator("form").filter({ has: page.locator(`input[value="${name}"]`) });
  await edit.getByRole("checkbox").uncheck();
  await edit.getByRole("button", { name: L.save, exact: true }).click();
  await expect
    .poll(async () => {
      const r = await page.request.get(`/api/operations?location=${location}`);
      const body = await r.json();
      return body.context?.stations.find((s: { name: string }) => s.name === name)?.is_active;
    })
    .toBe(false);
  const sibling = await page.request.get(
    "/api/operations?location=c2222222-2222-2222-2222-222222222222",
  );
  expect(sibling.status()).toBe(200);
  expect(
    (await sibling.json()).context.stations.some((s: { name: string }) => s.name === name),
  ).toBe(false);
});
