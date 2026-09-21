# Darb REST: Database Architecture & Multi-Tenant Schema

## Current commercial contract

[V1-COMMERCIAL-MODEL.md](V1-COMMERCIAL-MODEL.md) is the commercial source of truth.
Operator-applied migrations 16/17 add the editable plan catalog and revoke dormant
operational entry points. `public_commercial_plans()` supplies active localized plans;
Platform Admin writes commercial fields separately from entitlements. Public requests
read current values without a deployment-time price snapshot. WhatsApp carts/reservation
requests create no order or payment records. Existing operational tables are retained.

## 1. Overview & Entity Hierarchy

Darb REST models multi-tenancy strictly through decoupled memberships:

```
auth.users
  ├── profiles (1:1 with user)
  ├── platform_admins (isolated super-admins)
  └── memberships (M:N)
        └── businesses (Tenants: Restaurant / Café)
              ├── business_settings (1:1)
              ├── locations / branches (1:M)
              ├── business_feature_overrides (1:M)
              └── plans (N:1) ── plan_entitlements (1:M)
```

**Key Architectural Invariants**:

1. No `business_id` is stored directly on `profiles` or `auth.users`.
2. A user can belong to multiple businesses with different roles in each.
3. A business can have multiple branch locations.
4. Location slugs are unique within a business (`UNIQUE (business_id, slug)`).
5. Business slugs are globally unique across the platform (`UNIQUE (slug)`).
6. Platform super-administrators are isolated from tenant membership roles.

---

## 2. Table Specifications

| Table                        | Primary Key          | Foreign Keys                       | Key Responsibilities                                                                                                                                                                   |
| ---------------------------- | -------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `profiles`                   | `id` (UUID)          | `auth.users(id)`                   | 1:1 user profile (`full_name`, `phone`, `preferred_locale`). Auto-created via trigger on `auth.users`.                                                                                 |
| `platform_admins`            | `id` (UUID)          | `auth.users(id)`                   | Separate platform-level authorization. Never exposed client-side.                                                                                                                      |
| `plans`                      | `id` (UUID)          | —                                  | Commercial plans (`starter`, `pro`, `enterprise`) with localized names.                                                                                                                |
| `plan_entitlements`          | `id` (UUID)          | `plans(id)`                        | Feature entitlements per plan (`feature_key`, `enabled`, `limit_value`).                                                                                                               |
| `businesses`                 | `id` (UUID)          | `plans(id)`                        | Core tenant entity (`slug`, `name`, `business_type`: restaurant/cafe, `status`, `timezone`, `currency`, `onboarding_step`).                                                            |
| `business_settings`          | `business_id` (UUID) | `businesses(id)`                   | 1:1 branding and operational config (`primary_color`, `accent_color`, `logo_url`, `cover_url`).                                                                                        |
| `locations`                  | `id` (UUID)          | `businesses(id)`                   | Branch locations (`slug`, `address_line1`, `city`, `country`, `latitude`, `longitude`, `is_primary`).                                                                                  |
| `location_operating_hours`   | `id` (UUID)          | `locations(id)`                    | Normalized daily opening intervals (`day_of_week` 1-7 ISO, `open_time`, `close_time`, `is_closed`). Non-unique index on `(location_id, day_of_week)`; multiple intervals are possible. |
| `memberships`                | `id` (UUID)          | `auth.users(id)`, `businesses(id)` | User-to-business mapping (`role`, `status`). Unique `(user_id, business_id)`.                                                                                                          |
| `business_feature_overrides` | `id` (UUID)          | `businesses(id)`                   | Per-business entitlement overrides with expiration.                                                                                                                                    |
| `onboarding_drafts`          | `id` (UUID)          | `auth.users(id)`                   | Server-side onboarding draft persistence (`user_id`, `current_step`, `data` JSONB). Enforces `UNIQUE (user_id)` to avoid duplicate draft businesses.                                   |

---

## 3. Tenant Roles & Permission Matrix

Tenant roles inside businesses are strictly prioritized:
`owner` > `admin` > `manager` > `editor` > `staff` > `read_only`

| Role        | Scope & Permissions                                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------------------------------------ |
| `owner`     | Complete administrative control over business, billing, branch creation, member invitations, and deletion.               |
| `admin`     | Business and branch operational management, member management, branding, and menu control (excludes ownership transfer). |
| `manager`   | Operational branch management, menu updates, live order processing, and branch settings.                                 |
| `editor`    | Menu and catalog authoring, dish descriptions, and category organization.                                                |
| `staff`     | Order processing, kitchen display viewing, and live service management.                                                  |
| `read_only` | Inspection and reporting access only; all mutations denied.                                                              |

---

## 4. Row Level Security (RLS) & Helper Functions

All 11 public application tables enforce Row Level Security (`ENABLE ROW LEVEL SECURITY`).

### SECURITY DEFINER Helpers

To prevent infinite recursion in RLS policies during membership evaluation:

- `is_platform_admin(user_id)`: Checks if the user is listed in `platform_admins`.
- `user_belongs_to_business(business_id)`: Verifies whether `auth.uid()` has an active membership in the business.
- `get_user_business_role(business_id)`: Returns the caller's active role within the business.
- `has_business_role(business_id, required_roles)`: Tests the active role against the supplied allowed-role list.

### Owner Safety Trigger

`prevent_last_owner_removal()`: Intercepts `DELETE` or `UPDATE` on `memberships` to prevent removing or demoting the final active owner of a business.

---

## 5. Canonical Migrations and Local Development

The three canonical migrations are:

1. `20260918000001_core_schema.sql`: nine core tables, helpers, triggers and RLS.
2. `20260918000002_onboarding_and_hours.sql`: onboarding step, operating hours and onboarding RPC.
3. `20260918000003_onboarding_drafts.sql`: one draft per auth user, timestamps and RLS.

Do not rewrite applied migrations. Create a new migration for a genuine subsequent schema change.

`supabase/config.toml` uses PostgreSQL 17 and enables `./seed.sql`. Local API grants currently match the linked project's legacy Supabase defaults through `auto_expose_new_tables = true`; the CLI marks that compatibility option deprecated. Review explicit grants in a future schema change before removing it or upgrading to a CLI that removes it.

`seed.sql` is strictly local/development data: three plans, 23 entitlements, two businesses, two settings records, three branches and 14 operating-hour records. Existing mock development sessions provide their own user/membership fixtures; this seed deliberately does not insert into `auth.users`, profiles or memberships. Real authenticated-user tests must create users through local Auth and assign memberships separately.

The seed uses valid UUIDs, parent lookups by business/plan codes, stable operating-hour IDs and conflict handling. PostgreSQL `TIME '24:00'` represents end-of-day midnight while satisfying the existing non-overnight constraint. It contains no schema DDL or production credentials.

### Safe workflow

`supabase start` starts local services. For each schema change:

```bash
supabase migration new <name>
# Edit the new migration, then test migrations and seed from zero:
supabase db reset --local
supabase db lint --local --schema public
supabase db push --dry-run
supabase db push
supabase migration list
```

Never use `supabase db reset --linked`. Never use `--include-seed` against production. Do not manually execute migration files in the remote SQL Editor; an emergency repair must be explicitly documented and reconciled afterward.

### Reconciliation — 2026-09-19

The linked project was verified as **Darb_Rest** without changing its reference. Manual SQL Editor application had left migration-history records missing. Before any history repair, public-schema, auth-schema and data backups were saved under ignored `.tmp/supabase-reconcile/` (sensitive recovery artifacts; never commit).

| Migration      | Initial actual remote state                                                                                    | Action                               |
| -------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| 20260918000001 | Fully present; columns, constraints, indexes, policies, RLS, functions and enabled auth signup trigger matched | History repair only                  |
| 20260918000002 | Fully present; onboarding step, hours objects and RPC matched                                                  | History repair only                  |
| 20260918000003 | Absent, including all draft objects                                                                            | Applied once through normal CLI push |

Commands executed after verification:

```bash
supabase migration repair 20260918000001 --status applied
supabase migration list
supabase migration repair 20260918000002 --status applied
supabase migration list
supabase db push --dry-run # Only migration 3; no seeds or roles
supabase db push --yes
supabase migration list
```

No migration SQL was rerun, no one-time remote repair SQL was needed, and no historical migration file was modified. All three linked history entries match. The original seed failure was reproduced as SQLSTATE `22P02` (invalid branch UUIDs); correcting only those exposed SQLSTATE `23514` (midnight closing time violating `chk_time_order`). Random operating-hour IDs with no day uniqueness also made the old conflict clause ineffective on reapplication. These were fixed in seed data only.

Final verification: two clean local resets and direct seed reapplication passed. Local/remote catalogs match across columns, constraints, indexes, policies, RLS flags and triggers; `supabase db diff --linked --schema public` returns an empty diff. Both local and remote schema lints report no errors. `supabase db push --dry-run` reports up to date with no migrations or seeds. All three migration hashes are unchanged. Before/after data dumps contain no table-data INSERT/COPY records; no remote seed or data mutation was performed.

```text
Local           Remote
20260918000001  20260918000001
20260918000002  20260918000002
20260918000003  20260918000003
```

Repository validation passed: `pnpm typecheck`, `pnpm lint`, `pnpm test` (39), `pnpm build`, `pnpm test:e2e` (18), and `pnpm format:check`. This closes the reconciliation gate only; Phase 4 was not started.

The existing database TypeScript contract is maintained in `packages/supabase/src/types.ts`; it includes onboarding hours, drafts, onboarding_step and the onboarding RPC. There is no separate generated type file.

---

## 6. Atomic Onboarding & Branch Procedures

### Atomic Business Creation (`create_onboarding_business`)

To prevent partial/orphaned entities during onboarding, `create_onboarding_business(...)` executes within an atomic PostgreSQL transaction:

1. Validates authenticated caller (`auth.uid()`).
2. Relies on the business slug unique constraint; reserved-slug validation is in the application.
3. Enforces plan existence through the foreign key; the RPC does not check plan activity.
4. Inserts `businesses` record with status `active` and completed onboarding step.
5. Inserts 1:1 `business_settings` (primary/accent colors, media placeholders).
6. Inserts `memberships` linking `auth.uid()` with role `owner` (preventing client-side user injection).
7. Inserts initial branch in `locations` marked `is_primary = true`.
8. Inserts the supplied operating-hour records; seven records are not enforced by the RPC.
9. Returns `business_id`, `slug`, `location_id` and `status`. These migrations do not define audit logs.

### Server-Side Onboarding Draft Persistence (`public.onboarding_drafts`)

In order to avoid storing sensitive or meaningful business data only in client-side cookies:

- In-progress onboarding state (business name, legal name, slug, contact, address, hours, plan) is persisted server-side in `public.onboarding_drafts`.
- The client cookie `darb_rest_onboarding_draft` stores strictly minimal state: `{ draftId: string, currentStep: number }`.
- Table schema:
  - `id`: UUID primary key.
  - `user_id`: UUID NOT NULL referencing `auth.users(id)` ON DELETE CASCADE.
  - `current_step`: SMALLINT NOT NULL DEFAULT 1.
  - `data`: JSONB NOT NULL DEFAULT `'{}'::jsonb`.
  - `CONSTRAINT uq_onboarding_drafts_user UNIQUE (user_id)`: Prevents duplicate draft businesses for a single user.
- Row Level Security (RLS): Strict policies (`user_id = auth.uid()` OR `is_platform_admin()`) restrict read, write, update, and deletion solely to the authenticated owner.
- Draft cleanup is performed by the application after onboarding; the RPC itself does not delete drafts.

## 7. Restaurant content migration

20260919000004_restaurant_content.sql adds business-owned menus, branch assignments,
sections, dishes, absolute-price variants, reusable modifier groups/options, structured dietary
and allergen links, branch overrides, private menu-media storage policies and content audit events.
Migrations 1–3 remain unchanged. Composite foreign keys and RLS enforce tenant ownership.

The content migration also closes arbitrary initial-owner self-enrollment into existing businesses.
The onboarding RPC continues to create the initial owner atomically.

The existing packages/supabase/src/types.ts is now generated from the applied local schema:

    supabase gen types typescript --local > packages/supabase/src/types.ts

Seed additions are development-only: two menus, three sections/dishes, variants, modifiers and
metadata. Do not include seed when pushing remotely. Use supabase db reset --local, then
supabase test db to validate clean reconstruction and tenant/role boundaries. Detailed behavior:
[MENU-ARCHITECTURE.md](./MENU-ARCHITECTURE.md).

Verified 2026-09-19: migration 4 was applied with supabase db push after a dry run identified
only that migration and ignored schema/data backups were created under .tmp/phase4.
No remote seed data was inserted. Versions 20260918000001, 20260918000002, 20260918000003
and 20260919000004 now match locally/remotely. Final linked public diff reports no schema changes,
linked/local lint reports no schema errors, and push --dry-run reports up to date.
Run linked CLI diagnostics sequentially: concurrent commands may rotate the temporary CLI
login credentials while another command is still using them.

## 8. Ordering migration

20260919000005_ordering_core.sql adds orders, immutable order_items/order_item_modifiers snapshots,
and an internal guest write-limit table. Existing migrations remain unchanged. Composite
business/location ownership, tenant SELECT RLS, RPC-only writes, optimistic revisions and
idempotent submission protect the ordering lifecycle.

The pricing RPC validates current published assignments, availability, variants/modifiers and
branch overrides before calculating totals. Customer-supplied prices are never used. Guest
capabilities are hashed; the public web server uses a service-only gateway and exposes no order
tables anonymously. See [ORDER-ARCHITECTURE.md](./ORDER-ARCHITECTURE.md).

Verified 2026-09-19: migration 5 was applied through `supabase db push` after an isolated
dry run and ignored schema/data backups under `.tmp/phase5`. No remote seed was run.
All five local/remote migration versions match; the linked public schema diff is empty,
local/remote lint reports no errors, and the final push dry run reports up to date.
Repeated `supabase db reset --local` runs and all 52 database tests pass.

## 9. Checkout and payments migration

`20260919000006_payments.sql` adds payments, callback event deduplication, atomic guest checkout,
provider-reference binding, payment state application, manual restaurant collection and an unpaid
online-order fulfillment guard. Amounts come exclusively from the existing validated order RPC.
Payment reads retain tenant RLS; callback writes require service role. Guest projection remains
capability-scoped. No card details or raw callback payloads are stored.

Migration 6 was applied and tested locally only. The linked remote was not modified, and no remote
push, repair or seed command was run. The operator must apply migration 6 before deploying Phase 6
application code. Existing migrations 1–5 remain immutable. Generated types reflect the local schema.
See [PAYMENT-ARCHITECTURE.md](./PAYMENT-ARCHITECTURE.md) for transitions, idempotency and deployment.

## 10. Tables and QR migration

`20260919000007_tables_qr.sql` adds restaurant_tables and restricted table_qr_tokens, composite
order/table ownership, historical table snapshots, manager-only mutations, and QR-aware guest
save/checkout wrappers. Revocation and ordering share transaction locks; table assignment is
resolved from an active capability rather than supplied database IDs.

Migration 7 is file-only and has not been executed locally or remotely. Types were extended from
the SQL contract pending operator application and regeneration. Existing migrations 1–6 are unchanged.
Database/integration checks require the operator to apply migration 7 to the local test database.
See [TABLE-QR-ARCHITECTURE.md](./TABLE-QR-ARCHITECTURE.md) for handoff and validation.

## Phase 8 kitchen operations — validated locally

`20260919000008_kitchen_operations.sql` adds cancellation reasons, minimal branch Realtime signals,
operation idempotency/audit records and authorized branch feed/mutation RPCs. It preserves the
existing status/payment guards. The operator applied the migration. Validation verified all 148 database assertions locally without
executing migrations or remote commands. See [KDS-ARCHITECTURE.md](./KDS-ARCHITECTURE.md).

## Phase 9 restaurant operations — validated locally

Migration 9 adds branch stations/routes/rosters, line preparation tasks, user notification
preferences, operational audit and printer-event references. Existing orders gain rush,
assignment and operational timestamps; tables gain service state/assignment. Authorized RPCs
own mutations and reuse canonical order transitions. The operator applied migration 9. All 205
local database assertions pass, including 57 operations assertions. No migration was executed during implementation.
See [RESTAURANT-OPERATIONS.md](./RESTAURANT-OPERATIONS.md) for routing, access boundaries and handoff.

## Phase 10 appearance — awaiting operator application

Migration 10 adds restaurant_appearance with separate draft/published snapshots, revision and
publication timestamps. Owner/admin-only reads and an authorized, revision-checked mutation RPC
protect publication. There is no fixed template-ID database enum or catalog size limit. Public
server queries select published settings only. No migration or remote command was executed.
See [TEMPLATE-ARCHITECTURE.md](./TEMPLATE-ARCHITECTURE.md).
