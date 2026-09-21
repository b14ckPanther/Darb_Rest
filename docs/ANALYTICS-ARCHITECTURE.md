# Analytics & Business Intelligence — Phase 11

> Current commercial scope: [Darb REST v1](V1-COMMERCIAL-MODEL.md). Operational,
> payment, table-order and custom-domain sections below document retained technical
> foundations. They are dormant, not current subscription capabilities.

## Entry and authorization

`/[locale]/analytics` reports real submitted-order data. Owners, admins, managers and read-only
members can access reports; editors and staff cannot. Page and CSV handler resolve authenticated
active-business context. The RPC independently checks membership/role, active business and exact
branch ownership. Existing platform-admin behavior in the shared role helper is retained.
Memberships remain business-wide; selecting a branch filters data and does not introduce a new
staff permission system. Invalid explicit branches fail closed rather than falling back to all.
No customer names, phones, guest tokens, payment references or provider secrets enter the report.

## Database boundary

Operator-applied migration **20260920000013_restaurant_analytics.sql** adds one read-only,
security-definer RPC with a pinned empty search path and explicit authenticated execute grants,
plus submitted-order and rejection-audit lookup indexes. Existing schemas, transitions, RLS
policies and ordering/payment/QR/KDS implementations are unchanged. No migration was executed.

A single statement materializes the selected order/payment cohort once and aggregates it in the
DB. Payments are unique per order, avoiding join multiplication. Item snapshots are aggregated
separately, so modifiers and station tasks cannot multiply sales. No menus are fetched, no N+1
network calls occur and the client never downloads raw orders for aggregation. No service-role
client is used. The server sends only aggregate rows to the page.

## Metric definitions

- Dates are inclusive calendar days in the **business timezone**, including when a selected
  branch has another timezone. UTC bounds use `AT TIME ZONE`, preserving daylight-saving changes.
  Default is the last 30 calendar days; maximum is 366 inclusive days. Invalid/reversed dates fail.
- The cohort uses `submitted_at`, never draft creation or payment settlement date. Drafts and
  orders without submission timestamps are excluded. Historical missing data is not fabricated.
- Order count includes cancellations. Order value sums snapshot subtotal cents for noncancelled
  orders; average order value divides by that same noncancelled count.
- Collected payments sum currently `paid` transactions, even when their order is cancelled.
  Pending, authorized, failed, cancelled and refunded payments are not collected revenue.
  This is a current-state submission cohort, not accounting revenue, settlement reporting or
  a cash-flow ledger. Later payment/refund changes can change historical cohort results.
- Payment **method** (restaurant/online/unrecorded) and **status** are independent breakdowns.
- Cancellation rate is cancelled / all submitted orders. Rejections count only audited
  `submitted → cancelled` transitions. Legacy cancellations without audit evidence are not
  inferred to be rejections.
- Preparation is `ready_at - prep_started_at` for noncancelled orders with valid timestamps.
  Lifecycle is `completed_at - submitted_at` for completed orders. Missing/reversed pairs are
  excluded; each average displays its sample count. These are whole-order timings, not station
  averages. No historical timestamps are backfilled.
- Daily, local hour and ISO weekday counts represent arrivals. Breakdown bars show order count
  with noncancelled order value beside it. Days/hours without activity are absent, not estimated.
- Top 50 items rank by quantity, then stable item/currency keys. Quantity and value use immutable
  submitted line snapshots, including variant and modifier costs, excluding cancelled orders.
  Latest snapshot name represents each item; menu renaming/deletion does not change its prices.
- Branches compare the same cohort. Table activity includes only dine-in; unlinked dine-in is
  marked unrecorded. This is order activity, not occupancy utilization, covers or table turnover.
- Every monetary group is separated by currency. No conversion or cross-currency totals exist.

## UI and export

Server-rendered filters use ordinary GET URLs. The dashboard provides metric cards, accessible
text-backed horizontal bars and a scrollable item table. Arabic/Hebrew/English dictionaries,
existing Cairo/Heebo/Ubuntu fonts and logical properties are reused. Empty data has an explicit
empty state; database errors show an unavailable message, never invented zero metrics.

`/api/analytics` reauthenticates and reruns the same filters/RPC for daily CSV export. Private,
no-store responses contain only date/timezone/count/value/collected aggregates; no customer data.
UTF-8 BOM supports spreadsheet opening; cells are escaped and formula prefixes neutralized.
It is a bounded daily CSV foundation, not a raw-order or accounting export.

## Post-migration validation

The operator applied migration 13 locally and remotely. Local validation ran only, without
migrations, resets or remote commands. All **27 analytics database assertions pass**, covering
currency separation, date/branch isolation, order and payment arithmetic, snapshot quantities,
cancellations/audited rejection rates, local busy hours/days, branch comparison and valid timing
samples. Fixtures are enclosed in a rollback transaction.

The real EN/AR/HE browser checks now submit a guest order before capturing the populated dashboard,
then verify branch/date controls, empty states, forbidden branch selection, CSV content and download,
private cache headers, fonts, RTL and 390/430/834/1440px layouts. Screenshots wait for the existing
sidebar padding transition so desktop composition is assessed after the resize completes.
An ambiguous alert assertion was scoped to the actual analytics error instead of Next.js's route
announcer. No application or schema correction was required.

Production-scale query latency and physical-device/cross-browser behavior remain unbenchmarked.
No predictive modeling, forecasting, inventory, accounting integrations or later phase work is included.

Final validation: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`,
`pnpm test:e2e` (**59 passed**) and `pnpm format:check` all pass. Phase 11 validation is complete.
Local Chromium screenshots were reviewed; physical-device/cross-browser and production-load
validation remain limitations. No next phase was started.
