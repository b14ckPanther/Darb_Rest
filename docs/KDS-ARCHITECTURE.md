# Kitchen and order operations — Phase 8

> Current commercial scope: [Darb REST v1](V1-COMMERCIAL-MODEL.md). Operational,
> payment, table-order and custom-domain sections below document retained technical
> foundations. They are dormant, not current subscription capabilities.

## Scope and permission boundary

`/[locale]/kitchen` is a branch-scoped operational board for owner, admin, manager and staff.
The page resolves the active business from the authenticated session, lists its active branches,
and uses the selected branch URL or active-branch cookie. An invalid explicit branch fails closed.
Editors/read-only members cannot open the board, call its feed or subscribe to its signal table.
Existing memberships are business-wide: authorized operators can intentionally select any active
branch in that business. This phase does not invent per-employee branch assignments.

Every feed request and operation independently authenticates and resolves tenant context. The
RPCs repeat role, active business, active location and order ownership checks. Client filters
are not authorization. Feed responses are private/no-store and project only kitchen information;
customer phone, guest capability hashes, cart payloads and payment secrets are excluded.

## Feed and recovery

The board reads `/api/kitchen` with branch, status and offset. `kitchen_orders` returns 50 orders,
a total count and an incoming-order counter. The default queue is oldest submitted first;
completed/cancelled views show newest submissions first. Explicit pagination avoids silently
truncating a busy kitchen. Immutable item, variant and modifier snapshots are projected in one
relational database call using the existing order indexes; the browser never loads menus.

`kitchen_signals` contains only business/location IDs, revision, submitted count and update time.
A trigger updates one row per branch for submitted/non-draft order changes. Only this minimal
table is added to the Supabase Realtime publication; full orders and guest records are not
published by this migration. The browser waits for the SSR session, explicitly binds its JWT to Realtime and waits for
Postgres subscription confirmation before showing live status. Its subscription filters by location and
checks business/location again before refreshing the authoritative feed.

Incoming counters increment on new submitted orders and draft submission, not status changes.
Counter differences notify even when an arrival is beyond the current 50-order page. Initial
loads establish a baseline without sounding an alarm. Visible new tickets are highlighted until
dismissed. Sound is opt-in, unlocked by a user gesture, and stays local to the current queue view.
Changing branch/filter/page remounts the queue and resets its notification baseline/sound.

Realtime is a refresh hint, never a durable event log. Requests are coalesced, signals debounced,
and responses from disposed branch/filter views ignored. The SDK reconnects; every successful
subscription refetches the full visible page. A 15-second visible-page poll catches missed events,
including missing publication configuration. Returning to the tab or going online refreshes
immediately. Requests time out after ten seconds. Offline/failed refreshes disable transitions;
permission failures also clear displayed orders. A successful poll permits operations even while
Realtime is disconnected, with an explicit fallback status and a manual refresh button.

Protocol reference: [Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes).

## Status, idempotency and cancellation

`operate_kitchen_order` locks a client-generated action UUID, checks branch ownership, and calls
canonical `transition_order`. The established status sequence and online-payment guard remain
unchanged: submitted → accepted → preparing → ready → completed. Cancellation is allowed only
from submitted/accepted/preparing/ready. Rejecting an incoming order uses cancelled with a reason.

Each successful operation records actor, order, branch, expected revision, target and optional
reason in `order_operations`. An exact retry returns success without a second transition, even
if the order has advanced since. Reusing an action UUID with a different payload conflicts.
Optimistic revisions reject two distinct concurrent actions against the same revision. The client
also disables action buttons during an operation and retains its UUID for retries of that payload.

KDS cancellation requires a trimmed reason of 1–500 characters. `orders.cancellation_reason` is
nullable for historical/legacy cancellations; older order-detail actions remain compatible.
The reason is visible in KDS cards and detail dialogs. Cancelling an order does not refund or
cancel its payment transaction; the confirmation explicitly tells staff to review payment
separately. This phase does not introduce a provider refund API.

## UI and context

Tablet/desktop use a responsive ticket grid; mobile uses a single column. Filters, notification
status, order age, table/area or takeaway, quantity, variant and modifier groups remain readable.
Native modal details provide keyboard focus containment and Escape dismissal. All controls and
messages use AR/HE/EN dictionaries, existing script fonts and logical layout properties. Takeaway
never displays table context. No advanced stations, printers, waiter assignment, delivery,
analytics, inventory, loyalty or coupons are included.

## Validation record

The operator applied migration 8 locally and remotely. Local validation ran only; no
migrations, resets, repairs, remote seeds or remote schema commands were run during validation.

- All 148 database assertions pass, including 28 KDS assertions covering tenant/branch isolation,
  permitted/impossible transitions, action replay, stale revisions, cancellation reasons,
  dine-in snapshots, takeaway separation, permissions and Realtime publication.
- All 39 E2E tests pass. The real KDS test observes an authenticated WebSocket join and actual
  PostgreSQL change frames, receives a guest order and advances it through completion.
- A browser auth race was fixed: subscribing before session initialization joined anonymously.
  The channel now awaits the browser session and binds its JWT before subscribing; live status
  waits for database subscription confirmation. A regression assertion checks authenticated joins.
- Reconnect catch-up and stale-action disabling pass transport-fixture tests. With WebSockets
  blocked, the real local API successfully refreshed three times, confirming polling fallback.
- Real-data AR/HE/EN boards and detail dialogs were checked at 375/834/1440px with correct RTL/LTR
  direction and no horizontal overflow; screenshots were visually reviewed.
- Typecheck, lint, 76 unit tests, both production builds and format check pass.

Remaining limitations: verification used local Supabase and desktop Chromium with emulated
viewport sizes. Physical tablet/audio behavior and production multi-client load were not tested.
No Phase 9 or advanced kitchen work was started.

## Phase 9 extension

The new operations workspace reuses this board and recovery mechanism with a filtered station feed,
line tasks, priority and assignments. The original kitchen route remains available. Whole-order
ready/completed remains authoritative and finishes remaining station tasks. See
[RESTAURANT-OPERATIONS.md](./RESTAURANT-OPERATIONS.md); migration 9 was applied by the operator and locally validated.
