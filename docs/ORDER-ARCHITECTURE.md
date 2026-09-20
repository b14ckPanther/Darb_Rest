# Ordering core — Phase 5

## Entry points

- Guests: /[locale]/order/[businessSlug]/[locationSlug] in apps/web. No account required.
- Owners: existing authenticated menu preview in apps/admin, plus links to the customer menu.
- Operations: /[locale]/orders and /[locale]/orders/[orderId] in apps/admin.

Public slugs resolve an active business and an active branch belonging to it. The server projects
only published, assigned menus, visible sections/items, their variants/modifiers and relevant
branch overrides. Draft menus, hidden dishes, memberships, customer records and administrative
actions never enter the public menu response. Images use short-lived signed URLs for only those
visible dishes. The existing owner preview remains separate and can inspect drafts, but only
active assigned menu items can be ordered. Its notice explicitly says submissions create real,
attributed orders.

## Cart and customer flow

The shared OrderingMenu builds on MenuPreview without replacing the Phase 4 model. Local state
handles configuration, add/edit/remove, quantity and totals without network requests per action.
Identical item/variant/modifier configurations merge. Quantity is 1–99, cart size at most 50 lines,
and a line accepts at most 100 distinct modifier IDs.

Session storage retains only cart intent (IDs, quantity, order ID/revision and branch), scoped to
the guest business/branch or authenticated owner/business. Customer contact details are not stored
there. Explicit Save draft persists the order on the server and restores customer details on return.
Removing the last item can save an empty draft; submitting an empty order is forbidden.
Switching branch requires clearing the current cart. Saved drafts for other branches remain intact.

Dine-in requires a name and has an optional phone; takeaway also requires a phone. There are no
addresses, accounts or table assignments. The guest confirmation URL contains only an order UUID;
the same guest cookie is required to recover its data. An unrelated visitor cannot access it.

## Authoritative pricing and validation

Client priceCartLine/cartSubtotal are display estimates using integer minor units. No client
name, item price, variant price or modifier price is accepted by the mutation schema.

save_order_core independently resolves the active business/branch and each current item:
published menu assignment → visible section → nonarchived item → branch visibility/availability.
Variant selection is required whenever the item has variants; only available variants of that
item qualify. Variant prices are absolute. Branch price overrides replace the base price only,
preserving the Phase 4 variant rule. Every modifier must be available and belong to an attached
group, with no duplicates and all min/max/required rules satisfied.

The database calculates (base or variant + modifiers) × quantity and the subtotal using integer
cents. The client expected subtotal is a comparison only: mismatches reject the entire transaction
with price_changed. The user refreshes the menu and reviews the new total; prices are not silently
accepted. All currencies must match the business. The maximum order subtotal is 1,000,000,000
minor units.

## Persistence and snapshots

orders holds business/branch, fulfillment, minimum customer details, currency, authoritative
subtotal, creator or hashed guest capability, draft cart intent, status, revision and timestamps.
order_items stores immutable ordered names, variant names, base/variant unit price, modifier
unit amount, quantity and line total. order_item_modifiers stores each selected group/option
name and price. Source IDs are references for diagnostics, not foreign keys that could erase or
rewrite history when catalog children change.

A save replaces draft snapshots atomically. Submission reprices again and freezes them.
Failed validation rolls back every parent/child write. The same per-business advisory lock as
content batches coordinates menu edits and pricing; selected catalog rows are share-locked.
Revisions reject stale updates. Repeating an identical submission with the same order UUID
returns the existing order; changed payloads cannot rewrite submitted orders.

## Guest security

The web server creates a random 256-bit HTTP-only, SameSite=Lax cookie, Secure in production,
valid for seven days. Only its SHA-256 hash is persisted in orders. Clearing the cookie loses
guest recovery; account-based recovery is outside this phase.

Public reads and guest writes use server-only, narrowly parameterized RPCs. Those RPCs are
granted only to service_role; anonymous database clients cannot read order tables or invoke the
guest gateway directly. The server resolves slugs independently of submitted IDs, derives the
guest capability from its cookie, and returns a projected order without token hashes or actor IDs.
Next server actions enforce same-origin requests. The service-role key is never a public variable
or client import. Use SUPABASE_SERVICE_ROLE_KEY in the web server environment.

Guest successful saves are bounded to 30 per ten-minute capability window; failed transactions
roll back that counter too. This is a basic write limit, not a full external abuse-prevention
service. An internet deployment can add perimeter rate limiting independently.

Authenticated submissions use the existing tenant membership and role helpers. Read-only users
cannot place or change orders. All order tables use RLS and grant authenticated users SELECT
only within active memberships; mutations go through the validated RPCs. Staff/manager/admin/
owner can advance statuses. Editors can place orders from preview but cannot manage status.

## Status foundation

draft → submitted → accepted → preparing → ready → completed.
submitted/accepted/preparing/ready may instead become cancelled. Terminal states cannot
transition. Draft submission uses pricing validation, not the status RPC. Status updates require
the current revision and preserve all price/name snapshots.

## Queries, testing and boundaries

Public catalog loading uses one relational RPC and one batch image-signing request; no item-by-item
network reads. Order lists paginate 25 rows with business/status/branch filters. Detail views load
header, lines and modifiers in a fixed query batch, paginating modifiers only when API row caps
require it. Context reads are request-memoized, never shared globally across guest sessions.

Local integration: supabase start; supabase db reset --local; supabase test db; pnpm test:e2e.
An isolated web server on port 3100 uses local Supabase with server-only credentials; the existing
isolated admin server remains on 3101. No guest fixture data is pushed remotely.
NEXT_PUBLIC_WEB_URL can override owner-preview customer links (default localhost:3000 in
development and the configured production domain in production).

Phase 5 deliberately excludes payments, QR, table management, kitchen display, delivery,
coupons, loyalty, receipts/invoices, analytics and reservations. It does not calculate taxes,
fees or discounts: total is the validated subtotal. No stock reservation or scheduling is added.

## Phase 6 checkout integration

Public guest submission now passes through checkout and an atomic order/payment RPC. Draft saving
remains unchanged. Payment totals use the validated submitted snapshots. Online unpaid orders are
blocked from preparation; restaurant payments remain collectible on site. See
[PAYMENT-ARCHITECTURE.md](./PAYMENT-ARCHITECTURE.md). No real gateway is enabled yet.

## Phase 7 table context

QR-aware guest wrappers validate a revocable table capability in the ordering/checkout transaction.
Dine-in orders snapshot table name/area; takeaway carries no table assignment. Price authority,
payment idempotency and provider selection are unchanged. See
[TABLE-QR-ARCHITECTURE.md](./TABLE-QR-ARCHITECTURE.md). Migration 7 awaits operator application.

## Phase 8 operations

The branch-scoped kitchen board layers an idempotent, audited operation RPC around the canonical
transition function. It preserves payment gating and immutable item/table snapshots. Rejection
is cancellation with a staff reason; payment refunds remain separate. Minimal branch signals
support Realtime with polling recovery. See [KDS-ARCHITECTURE.md](./KDS-ARCHITECTURE.md).
Migration 8 was applied by the operator; local database and real integration validation pass.

## Phase 9 operational extension

The existing order remains authoritative. Station tasks snapshot routing for its existing lines;
rush, assignment and transition timestamps live on that same order. Canonical status transitions
create operational audit/printer references and synchronize terminal task states. These additions
do not alter customer pricing or payment guards. See
[RESTAURANT-OPERATIONS.md](./RESTAURANT-OPERATIONS.md) for the migration 9 handoff.

## Phase 10 public presentation

Business-slug URLs and legacy QR/order URLs render the selected published template. All templates
delegate configuration/cart/draft/checkout to the same OrderingMenu and existing server actions.
The private appearance preview can exercise client cart/configuration but guards all persistence.
Template changes do not change pricing authority, payment states or table-token validation.
See [TEMPLATE-ARCHITECTURE.md](./TEMPLATE-ARCHITECTURE.md).
