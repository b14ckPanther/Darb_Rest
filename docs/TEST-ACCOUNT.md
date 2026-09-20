# Full local test account

`pnpm seed:test-account` creates/updates a fictional account through Supabase Auth Admin API,
confirms its email and applies the password supplied in the environment. Existing users retain
their Auth UUID; creation lets Auth allocate the UUID. No password is stored in source or printed.
The workflow refuses an existing platform administrator and never grants platform privileges.

## Manual run (zsh, from the repository root)

Local Supabase must already be running with migrations 1–10 applied by the operator. This command
never starts, resets or migrates a database. Docker, Supabase CLI and installed dependencies are required.

```zsh
export TEST_ACCOUNT_EMAIL='test@darb.co.il'
read -rs 'TEST_ACCOUNT_PASSWORD?Test account password (12+ characters): '
printf '\n'
export TEST_ACCOUNT_PASSWORD
NODE_ENV=development TEST_ACCOUNT_CONFIRM=local-only pnpm seed:test-account
unset TEST_ACCOUNT_PASSWORD
```

The runner supports **local Supabase only**. It obtains the API URL and service key from local CLI
status, forces a local Unix Docker socket and rejects remote API endpoints, redirects, production
mode and absent explicit local confirmation. It ignores application Supabase environment credentials.
There is intentionally no remote override. Use the local-backed admin application to sign in.

Primary business: `darb-test-restaurant`, branches `central` and `garden`. The same account owns it
and has admin, manager, editor, staff and read-only roles in five separate lightweight businesses
(`darb-test-admin`, `darb-test-manager`, `darb-test-editor`, `darb-test-staff`, `darb-test-read-only`).
Select the corresponding business to test RBAC; the user is not a platform administrator.
Public entry: `/en/darb-test-restaurant?branch=central` (also AR/HE and garden).

## Fixture content

A dedicated unlimited development plan enables all current feature flags; flags for future features
do not implement those features. Includes branding, seven-day hours per branch, published Signature
and unpublished Editorial settings, two active menus plus a draft, multilingual dishes, private WebP
media, required milk modifiers, variants, dietary/allergen labels, branch price/visibility/availability
examples, sold-out and hidden dishes. Illustrative media are generated locally, not customer photos.
Branding uses external HTTPS placeholder images; these require internet access and can be replaced.

Five tables cover active/inactive and all operational states. Three have stable random active tokens;
one has a revoked capability absent from the resolver. `.tmp/test-account-qr.json` contains active
and revoked localized paths for manual testing (ignored, local-only). Inactive table has no token.

Seven historical example orders cover every canonical status, dine-in/takeaway, price snapshots,
large/oat configuration, pending/paid/failed and restaurant/online-test payments. Kitchen stations,
category routing, prep states, a rush order, operator assignment, per-branch notification preferences,
printer events and explicitly marked synthetic history are included. Payment records are fictional;
no provider is called and no charge/refund is issued. Printer rows do not send anything to hardware.
History snapshots are fixtures, not claims that the runtime transitions were executed.

## Idempotency and failure recovery

UUIDs/slugs are deterministic and namespaced away from existing E2E/seed fixtures. Content/settings
are upserted to their documented baseline; rerunning intentionally replaces edits to these fixture
records. Operational orders, snapshots, payments, tasks, printer/history records and active QR tokens
are inserted only when absent, preserving UI actions and avoiding duplicated transition side effects.
This is a rerunnable fixture installer, not an operational reset. All public-data writes run in one
transaction with deferred constraints so modifier capacity and FK ordering remain valid. No DDL,
constraint bypass, seed.sql changes or automatic migration is used.

Auth/password and Storage use their supported APIs and cannot join the SQL transaction. If SQL fails,
those steps may already have succeeded; correct the reported stage and rerun. Upload paths are stable.
Errors are sanitized to avoid leaking credentials; inspect local service logs if necessary. A local
lock prevents concurrent runs; after a terminated process, remove `.tmp/test-account-seed.lock` only
when no seeder is running. Existing platform admins must use a different test email.

The seeder is deliberately not executed during implementation or tests. Pure unit tests validate
production guards, SQL quoting, fixture determinism and insert-only operational behavior. Runtime
Auth/Storage/database integration remains for the operator's first manual run.

## Missing account after a local database reset

A successful local reset recreates baseline seed data; it does not rerun this separate Auth API
fixture installer. If `test@darb.co.il` is absent from local Auth, the sign-in page correctly rejects
its password. Run the manual command above again against the local stack, then sign in at
`http://localhost:3101/en/auth/signin`. Reinstalling restores the documented fixture baseline;
review the idempotency section before rerunning after manual fixture edits. The password is still
read only from the environment and must never be committed or logged.
