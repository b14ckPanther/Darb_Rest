# Checkout and payments — Phase 6

> Current commercial scope: [Darb REST v1](V1-COMMERCIAL-MODEL.md). Operational,
> payment, table-order and custom-domain sections below document retained technical
> foundations. They are dormant, not current subscription capabilities.

## Customer and operator flows

The public guest menu now progresses through cart review → checkout → payment outcome.
Checkout offers pay at restaurant and, only when a supported adapter is configured, online payment.
Dine-in/takeaway and minimum customer details remain unchanged. The owner preview remains an
attributed ordering tool; its existing orders may have no payment record. No historical payment
records are fabricated.

Pay-at-restaurant orders are submitted with a pending payment. Owner/admin/manager/staff can
acknowledge the full amount received on the order detail; the database records the actor and time.
This is a manual collection record, not an online charge or accounting document. Read-only users
and editors cannot acknowledge collections. Duplicate acknowledgments are harmless.

Online orders are submitted with payment pending. A database trigger prevents advancement into
accepted/preparing/ready/completed until paid. A browser redirect, query string, or client success
message never marks a payment paid. Guests recover outcomes through the existing HTTP-only guest
capability and order URL, and can explicitly refresh status. Failed/cancelled payments offer a new
order. There is one intent per order; automatic payment-method switching or new charge attempts
on a terminal intent are deliberately unsupported.

## Provider boundary and configuration

`packages/payments` defines the server-runtime `PaymentProvider` interface:

- `createIntent`: receives only an authoritative payment ID, integer amount and currency. The ID
  is the gateway idempotency key, including retries after timeouts.
- `verifyWebhook`: verifies the provider's signature over the raw body and normalizes the event.
- `refund`: full-refund adapter contract with a stable refund idempotency key. A future live refund
  workflow must persist that key before invoking the adapter. No merchant refund initiation UI or
  live money movement is enabled in this phase; verified full-refund callbacks are supported now.

Environment-driven selection is centralized in `selectPaymentProvider`. Checkout/order code has
no gateway-specific logic. The only installed adapter is `local-test`. A future Israeli gateway
is added as an adapter and registered in that selector, with its credentials kept server-only.
It must verify signatures using its official contract and normalize confirmed full amounts and
final outcomes; partial captures/refunds are not represented by this V1 schema.

For **local development only**, in the web server environment:

    PAYMENT_PROVIDER=local-test
    PAYMENT_TEST_WEBHOOK_SECRET=<random secret of at least 32 characters>

The adapter also requires NODE_ENV other than production and an HTTP localhost/127.0.0.1 Supabase
URL with a port. Production, remote Supabase, missing credentials, unknown provider IDs and no
provider selection all disable online payments. There is no silent test fallback. Pay at restaurant
continues to work. The isolated E2E web launcher configures its own local-only test secret.

A future redirect-based provider must return an HTTPS checkout URL whose exact origin is in
`PAYMENT_REDIRECT_ORIGINS` (comma-separated, server-only). Redirect origins are validated before
being sent to the client. Provider SDKs and secret keys must never be imported into client UI.
The public web server still requires SUPABASE_SERVICE_ROLE_KEY for its scoped guest gateway.

## Transactions, authority and idempotency

Migration `20260919000006_payments.sql` adds:

- `payments`: one row per order; composite business/order ownership, server amount/currency,
  method, provider/reference, public reference UUID, state, revision and collection audit metadata.
- `payment_events`: unique provider/event ID, payment linkage, body hash, normalized status,
  processing outcome and timestamp. Raw bodies and card/customer information are not retained.

`checkout_guest_order` calls the existing authoritative order validator and reserves the payment
in the same database transaction. Branch overrides, availability and variant/modifier rules are
unchanged. Payment amounts are copied from the validated order, never from a client field. Failed
validation leaves neither an order nor a payment. The existing order UUID, business transaction
lock and unique payment/order constraint serialize duplicate submissions. A changed payment
method/provider on an existing intent is rejected.

External provider calls happen after commit. Retrying after a timeout uses the same payment ID
and frozen submitted amount; it cannot create another order/intent. Reference attachment is
idempotent and rejects a different reference. Pending intents survive provider/network failures
for retry rather than being incorrectly marked failed. An already submitted order retains its
historical amount instead of being repriced under an existing payment.

## Webhooks and state transitions

POST `/api/payments/webhooks/[provider]` is a Node route with a 16 KiB streamed-body limit.
The adapter verifies authenticity before any database call. The local test signature is HMAC-SHA256
of `timestamp.rawBody`, with constant-time comparison and a five-minute timestamp tolerance.
Each live adapter must implement its provider's own verification protocol, not reuse this test
signature convention. Invalid requests are rejected without logging sensitive payloads.

`apply_payment_event` is service-role-only. It verifies payment ID, provider reference, amount and
currency against the stored intent. The event insert and status change are atomic. Repeated event
IDs with identical hashes return the existing state; conflicting payloads are rejected. An event
lock serializes duplicate callbacks, and the payment row lock serializes different events.
A callback that arrives before reference attachment receives a non-success response for retry.

States: pending, authorized, paid, failed, cancelled, refunded. Pending/authorized can settle or
fail/cancel. Confirmed settlement can correct an earlier failure/cancellation. A confirmed full
refund is terminal, including when delivered before an earlier capture notification. A late failure
cannot downgrade paid; a late capture cannot downgrade refunded. Stale events are recorded as
ignored. Adapters must report verified financial facts, not client return-page claims.

Payment and fulfillment states are separate. Cancelling an order does not silently cancel or refund
a gateway payment, and a refund does not silently cancel fulfillment. Operators must coordinate
those actions; future live adapters will need explicit cancellation/refund orchestration before
being enabled. Pending/failed/cancelled online orders cannot enter preparation. There is no automatic
expiry worker or provider reconciliation scheduler in this foundation.

## Access and references

Payments use tenant SELECT RLS; authenticated clients cannot write them directly. Event records
are server-only. Guest reads first authorize the existing business/branch/order capability and then
project payment status, amount, currency and reference. Knowing a payment/order UUID is insufficient.
Simulation actions independently enforce the local-only adapter and guest ownership on the server.
No anonymous table grants, card fields, provider secrets or raw callback bodies are exposed.

The public reference, immutable amount/currency and timestamps are the receipt/reference metadata
foundation. They are not an invoice, fiscal receipt, subscription or accounting integration.

## Migration and validation

Migration 6 has been tested **locally only**. The implementation did not run remote migrations, db push,
migration repair or remote seed operations in Phase 6. The operator must apply migration 6 before
deploying these application changes. Migrations 1–5 are unchanged. Apply through the normal migration
workflow so history is recorded; do not manually replay old migration SQL.

Local checks:

    supabase db reset --local
    supabase test db
    supabase db lint --local --schema public
    pnpm typecheck
    pnpm lint
    pnpm test
    pnpm build
    pnpm test:e2e
    pnpm format:check

Types are regenerated into the existing packages/supabase/src/types.ts from the local schema.
Unit tests cover provider selection, signatures, tampering, timestamp bounds and stable references.
Database tests cover authoritative totals, atomicity, duplicate submissions/events, state ordering,
fulfillment gating, guest/tenant boundaries and manual collection permissions. Browser tests cover
restaurant collection, local online success/failure/refund, webhook rejection and AR/HE mobile checkout.

QR generation, tables, kitchen display, delivery, loyalty, coupons, analytics, invoices and
subscriptions are not part of Phase 6.

Validation recorded 2026-09-19: all six requested pnpm commands pass (65 unit tests, 29 E2E tests),
87 database tests pass, local public-schema lint is clean, and clean resets succeed. Fifteen
AR/HE/EN checkout width combinations passed overflow/focus/Escape checks. A production server built
against local Supabase explicitly rejected the test provider and rendered online payment unavailable.
No remote migration was applied.

## Phase 7 table context

QR-aware guest wrappers validate a revocable table capability in the ordering/checkout transaction.
Dine-in orders snapshot table name/area; takeaway carries no table assignment. Price authority,
payment idempotency and provider selection are unchanged. See
[TABLE-QR-ARCHITECTURE.md](./TABLE-QR-ARCHITECTURE.md). Migration 7 awaits operator application.
