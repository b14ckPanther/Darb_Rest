# Tables, QR and dine-in context — Phase 7

## Scope and entry points

Admin `/{locale}/tables` manages tables within the selected business and branch. Tables have a
name/number, optional area, active state, archive timestamp and optimistic revision. Names are unique
(case-insensitive after trimming) within a branch while unarchived. Owner/admin/manager can create,
edit, archive, regenerate or revoke QR capabilities. Other active members can view table names but
cannot read QR capabilities or change tables. A table cannot be moved between branches; create a new
table in the destination branch instead.

Guest `/{locale}/q/{token}` resolves the current capability and redirects to the existing public
ordering route with a table query parameter. The page displays the table and area immediately, with
no account, table-picker or extra confirmation. Language links preserve the token. The customer can
choose takeaway separately; takeaway orders never carry a table ID or table-name snapshot.
Non-QR ordering remains available, including existing unassigned dine-in orders.

## Schema and permissions

Migration `20260919000007_tables_qr.sql` declares pgcrypto in the standard Supabase extensions
schema for cryptographic token generation and adds:

- `restaurant_tables`: business/location ownership, name/area, active/archive state and revision.
- `table_qr_tokens`: one current 256-bit random capability per table, separately protected by
  owner/admin/manager SELECT RLS. Anonymous clients and ordinary staff cannot read these rows.
- `orders.table_id`, `table_name`, `table_area`: composite ownership FK plus immutable historical
  display snapshots. A check constraint prevents table linkage on takeaway orders.

No direct authenticated writes are granted. `manage_restaurant_table` validates role and branch,
serializes changes with the existing business transaction lock, and rejects stale revisions.
Creation uses a stable client operation UUID to handle identical retries without duplicating a table.
Archiving revokes the capability and preserves order history. Revocation deletes the capability;
regeneration creates fresh cryptographic randomness, invalidating every previous printed code.
Deactivation immediately blocks resolution/submission; reactivating a table retains its existing
capability unless it was separately revoked. Regenerate when old printed copies must remain invalid.

Capabilities are stored in recoverable form because authorized managers must re-download existing
QR codes. They are not returned in the general table list component. They appear only in authorized
print/download artifacts and intended guest entry URLs. Possession grants table context, not access
to admin data or other guests' orders. Database IDs are never accepted as a substitute for the token.

A printed QR is a bearer link: it cannot prove physical presence. A person who possesses another
valid table's QR can open it. The system prevents guessing or changing a table ID/branch parameter
from assigning an unauthorized table; physical-presence verification is not claimed.

## Server-authoritative order linkage

`resolve_table_qr` is service-role-only and checks active business, active branch, active/unarchived
table and exact current token. It returns internal table identity and minimal display/route context;
the web server passes only table name/area into the client UI. Unknown, malformed, inactive, archived
or revoked capabilities fail closed. A token resolved for a different business/branch URL is rejected.

`save_table_guest_order` repeats these checks inside the same transaction as canonical menu pricing.
It shares the content/business lock and locks table/token rows, so revocation cannot interleave with
validation. It verifies ownership of an existing guest order before updating anything. Draft context
may change after validation, but submitted context is immutable. Names/areas are snapshots, so later
renames and archives do not rewrite existing orders.

`checkout_table_guest_order` wraps that operation and the existing atomic payment reservation. The
order UUID still controls idempotency; prices, branch overrides and payment amounts remain server
controlled. Payment-provider behavior is unchanged. The wrapper invokes the existing guest gateway
twice during checkout, so both invocations count toward its existing capability write limit.

A QR cart is scoped by business, branch and token in session storage. Server draft lookup uses the
resolved table identity, never a client-selected ID. Takeaway drafts are shared within the guest
branch scope so a takeaway draft saved from a QR entry can also resume there. The server binds business/branch/token to its
save and checkout actions; raw order payloads do not accept table IDs. Selecting takeaway clears
persisted table linkage. A stale QR is rejected even if a cart was opened before revocation.
Guest confirmation remains protected by the existing HTTP-only guest cookie. An invalid QR can be
removed from an owned order confirmation URL to view historical confirmation without assigning a
new table context.

## QR rendering and print

Authorized print pages generate actual QR images with the local `qrcode` library, error correction
Q, a four-module white quiet zone, and high-resolution PNG output. QR payloads use the configured
public web origin, supported locale and opaque token only. Origins must be HTTPS, except localhost
HTTP during development. Configure `NEXT_PUBLIC_WEB_URL` on the admin server for the customer host;
the default is localhost:3000 in development and the configured Darb production domain otherwise.
The isolated test admin launcher uses localhost:3100.

Cards show restaurant branding/name, branch, table/area, and a localized short scanning instruction.
QR pixels stay black on white rather than adopting tenant accent colors. Cards print in an A4
2-column layout with page-break protection. Single-code SVG/PNG downloads are authorized, uncached,
and served as attachments. Branch print batches contain up to 24 cards; browser Print → Save as PDF
provides bulk printable downloads. This avoids adding a separate invoice/PDF subsystem.

The admin branch table list has an explicit 1000-row safety ceiling. Larger installations need
server-side filtering/pagination before exceeding it. Printing batches is bounded independently.
The QR generator's API is documented in the [upstream repository](https://github.com/soldair/node-qrcode).

Guest QR and ordering pages use no-referrer policy and no-index metadata. QR responses should not
be included in analytics or third-party URL logging. Tokens must be treated as revocable capabilities,
not placed into public table directories or used as authentication for guest order history.

## Migration handoff and testing

**The operator has applied migration 7 remotely and reset the local database successfully.**
The implementation did not execute migrations. The user reserved migration application and verification. No db push, migration execution/repair, remote seed or remote schema command was
run in Phase 7. Migrations 1–6 are unchanged. Migration 6 must be applied before migration 7.

The existing `packages/supabase/src/types.ts` was extended from the migration definition, without
creating a competing type file. After applying migration 7, regenerate that file from the verified
schema using the repository's existing convention and check the result.

Added coverage:

- Unit tests: opaque token/locale/origin validation, management roles, strict table input schemas.
- Database tests: tenant isolation, staff restrictions, token regeneration, invalid/inactive QR,
  branch tampering, dine-in/takeaway snapshots, archive/history behavior.
- Browser tests: manager creation, real PNG QR decoding, guest entry/order linkage, regeneration/
  revocation, and AR/HE mobile/RTL entry.

Schema-dependent tests now pass against the operator-prepared local test database.
Tests and fixture launchers never apply migrations automatically. After operator application, run:

    supabase test db
    pnpm typecheck
    pnpm lint
    pnpm test
    pnpm build
    pnpm test:e2e
    pnpm format:check

Kitchen display, waiter assignment, delivery, reservations, floor-plan editing, analytics and
loyalty/coupons are excluded. No KDS work has begun.

## Verification record

Local validation after the operator reset passes: 120 database assertions, 33 browser tests,
70 unit tests, typecheck, lint, both production builds and format:check. The database and browser
suites verify valid QR entry, token regeneration/revocation, tenant and branch isolation,
dine-in table snapshots, and takeaway without table linkage.

AR/HE/EN table management, printable cards and guest entry were checked at 375, 430 and 1440px
with no horizontal overflow and correct text direction. Exported A4 cards were rendered and
visually reviewed in all three languages. Print QA found and fixed visible admin controls and
unnecessarily stretched cards; print-only visibility now overrides interactive controls and cards
use their natural height. QR PNG decoding passes in all locales. Physical printer/scanner testing
remains an operator check; browser PDF export and software decoding were used here.
