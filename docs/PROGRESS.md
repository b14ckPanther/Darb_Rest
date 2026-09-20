# Darb REST: Roadmap & Progress

## Phase 1: Production Monorepo Foundation (Complete)

- [x] Turborepo 2 + pnpm workspaces initialization
- [x] TypeScript strict mode with modular tsconfig inheritance
- [x] Shared package ecosystem:
  - [x] `@darb-rest/config`: Shared platform constants, tsconfigs, and env helpers
  - [x] `@darb-rest/design-tokens`: Central token definitions, CSS variables, and tenant branding overrides
  - [x] `@darb-rest/types`: Multi-tenant domain models (User, Membership, Business, Location, Roles, Plans)
  - [x] `@darb-rest/validation`: Zod schemas for business profiles, locations, and branding
  - [x] `@darb-rest/i18n`: Multilingual support for Arabic (`ar`), Hebrew (`he`), and English (`en`) with Cairo, Heebo, Ubuntu fonts and 100% dictionary parity
  - [x] `@darb-rest/icons`: Central Lucide SVG abstraction with directional awareness and strict zero-emoji enforcement
  - [x] `@darb-rest/ui`: Accessible core primitives (Button, Input, Card, Badge, Skeleton, EmptyState, Modal, Tabs, BrandLogo)
  - [x] `@darb-rest/supabase`: Strict client, server (`@supabase/ssr`), and admin service-role boundaries
- [x] Next.js 16 App Router applications:
  - [x] `apps/web`: Public customer-facing shell (`rest.darb.co.il`) with hero, tokens, and RTL/LTR switching
  - [x] `apps/admin`: Business console shell with responsive sidebar, header, role indicator, and RTL support
- [x] Tailwind CSS v4 styling architecture with CSS variables
- [x] Vitest unit testing suite across packages
- [x] Playwright E2E smoke test baseline
- [x] Complete architecture and developer documentation

---

## Phase 2: Supabase Multi-Tenant Core, Auth, RLS, RBAC & Tenant Context (Complete)

- [x] Production Database Schema & Migrations (`supabase/migrations/20260918000001_core_schema.sql`):
  - [x] `businesses`: Tenant entity with unique slugs, status, and locale preferences
  - [x] `locations`: Branches per tenant with primary location logic and status
  - [x] `profiles`: User profile attached to `auth.users` with automatic registration trigger
  - [x] `memberships`: User-to-business relation with strict tenant roles (`owner`, `admin`, `manager`, `editor`, `staff`)
  - [x] `platform_admins`: Superuser table for global administrative operations
  - [x] `plans`, `plan_entitlements`, `business_feature_overrides`: Multi-tier monetization and feature flag system
- [x] Security Definer RLS & Functions:
  - [x] `is_platform_admin()` function with isolated `search_path` to avoid recursive RLS
  - [x] `has_business_role()`, `get_user_business_role()` and `user_belongs_to_business()` helpers
  - [x] `prevent_last_owner_removal()` trigger ensuring businesses never lose all active owners
  - [x] RLS enabled and strictly verified on all tenant tables
- [x] Comprehensive Database Seed (`supabase/seed.sql`):
  - [x] 2 development businesses (Bistro and Café) with 3 branches
  - [x] Mock development-session user fixtures in application code; no auth users inserted by SQL seed
  - [x] Standard commercial plans (`starter`, `pro`, `enterprise`) with feature flag entitlements
- [x] Supabase Package SSR Architecture (`@darb-rest/supabase`):
  - [x] `@darb-rest/supabase/server`: Next.js 16 SSR client with cookie handling
  - [x] `@darb-rest/supabase/client`: Browser client for client components
  - [x] `@darb-rest/supabase/admin`: Isolated service-role client for privileged background tasks
  - [x] Entitlement resolution engine (`Override > Plan > Default`) with full Vitest coverage
- [x] Server-Side Tenant Resolution & Route Guards:
  - [x] Next.js 16 `proxy.ts` migration replacing deprecated `middleware.ts`
  - [x] Server-side `resolveTenantContext()`: Authenticates session, verifies active memberships, and validates active business cookies
  - [x] Protected `(dashboard)/layout.tsx`: Seamlessly redirects unauthenticated users to `/auth/signin`
  - [x] Safe multi-tenant switching endpoint (`/auth/switch-business`)
  - [x] Secure signout route (`/auth/signout`)
  - [x] Development mock authentication route (`/auth/dev-login`)
- [x] Admin UI Integration:
  - [x] Client `TenantProvider` and `useTenantContext()` hook for reactive tenant state
  - [x] `Header` and `Sidebar` consuming real dynamic active tenant and branch data
  - [x] Dedicated sign-in page with quick development access for automated testing
  - [x] Empty state for authenticated users without active businesses
  - [x] Live Entitlements breakdown panel demonstrating tier limits
  - [x] Strict zero-emoji compliance verified across all components
- [x] Validation & E2E Testing:
  - [x] `pnpm typecheck`: 10/10 packages passing
  - [x] `pnpm lint`: 10/10 packages passing with 0 warnings
  - [x] `pnpm test`: 24 unit tests passing across all packages
  - [x] `pnpm build`: Full Turbo production build passing
  - [x] `pnpm test:e2e`: 8 Playwright E2E tests passing
  - [x] `pnpm format:check`: 100% Prettier compliance

---

## Phase 3: Business & Branch Onboarding (Complete)

- [x] Database & Migrations (`supabase/migrations/20260918000002_onboarding_and_hours.sql`):
  - [x] `location_operating_hours`: Normalized table for 7-day operating intervals (ISO days 1–7, open_time, close_time, is_closed) with a non-unique `(location_id, day_of_week)` index
  - [x] Onboarding state tracking: `onboarding_step` added to `businesses`
  - [x] Row Level Security (RLS) policies for operating hours allowing tenant member read and owner/admin mutation
  - [x] `create_onboarding_business(...)` SECURITY DEFINER atomic stored procedure creating business, settings, owner membership, primary branch and operating hours within a single rollback-safe transaction
  - [x] Seed operating hours for Haifa and Nazareth branches in `supabase/seed.sql`
- [x] Shared Packages Enhancement:
  - [x] `@darb-rest/types`: Added `DayOfWeek`, `OperatingHour`, `OperatingHoursInput`, `OnboardingDraft`, and `operatingHours` on `BranchLocation`
  - [x] `@darb-rest/validation`: Slug normalization (`normalizeSlug`), reserved slug guard (`RESERVED_SLUGS`, `isSlugAllowed`), multi-step onboarding validation schemas (Steps 1–6), `completeOnboardingSchema`, and 11 new unit tests (all passing)
  - [x] `@darb-rest/ui`: Accessible `Stepper` component with status styling (completed, current, upcoming) and RTL/LTR directional awareness with unit tests
  - [x] `@darb-rest/i18n`: Comprehensive `onboarding`, `locations`, `settings`, and `validation` dictionaries in Arabic, Hebrew, and English with 100% dictionary parity and strict zero-emoji enforcement
  - [x] `@darb-rest/config`: Added `COOKIE_KEYS.ONBOARDING_DRAFT`
  - [x] Onboarding Draft Persistence Refactor:
    - [x] Migration `20260918000003_onboarding_drafts.sql`: created `public.onboarding_drafts` table with `UNIQUE (user_id)` constraint, JSONB data payload, and RLS policies restricted to authenticated user or platform admin
    - [x] Minimal client cookie architecture: `darb_rest_onboarding_draft` cookie strictly stores only `{ draftId, currentStep }` with zero sensitive or meaningful business data in cookies
    - [x] Cross-session & cross-device resumption: authenticated users automatically resume their server-side draft even if client cookies are cleared or across devices
    - [x] Server actions in `apps/admin/lib/actions/`:
      - [x] `onboarding.ts`: `checkSlugAvailability`, `saveOnboardingDraft` (server-side persistence + minimal cookie), `getOnboardingDraft` (server-side lookup), `clearOnboardingDraft`, `completeOnboarding`
      - [x] `locations.ts`: `createBranchAction`, `updateBranchAction`, `setActiveBranchAction`
      - [x] `settings.ts`: `updateBusinessInfoAction`, `updateBusinessSettingsAction`
  - [x] Multi-step Onboarding Wizard (`components/onboarding-wizard.tsx`):
    - [x] Step 1: Business Identity & Slug (live uniqueness check, suggestion, multilingual names)
    - [x] Step 2: Category & Locale (Restaurant vs Café, primary language, timezone, currency)
    - [x] Step 3: Contact & Branding (public phone, email, website, social handles, hex color pickers, media placeholders)
    - [x] Step 4: First Branch (branch name, slug, address line, city, coordinates readiness)
    - [x] Step 5: Operating Hours (7-day schedule with open/close time inputs and closed day toggling)
    - [x] Step 6: Commercial Plan Selection (active plans loaded dynamically with entitlement summaries)
    - [x] Step 7: Review & Atomic Launch (summary validation and single-click launch)
  - [x] Onboarding Route & Layout:
    - [x] Dedicated onboarding layout (`app/[locale]/(onboarding)/layout.tsx`) with focused top-bar, locale switcher, and signout
    - [x] Server-driven page (`app/[locale]/(onboarding)/onboarding/page.tsx`) with draft recovery and safe plan retrieval
  - [x] Seamless Post-Onboarding Transition:
    - [x] Creator automatically assigned `owner` role via server-authenticated `auth.uid()`
    - [x] Newly created tenant and primary branch set in session cookies, immediately transitioning into dashboard
    - [x] Empty state CTA "Register New Business" connects directly to onboarding wizard
  - [x] Branch & Settings Management Pages:
    - [x] Locations Management (`/[locale]/locations`): List branches, view primary/active badges, switch active branch, and add new branch with plan quota enforcement
    - [x] Business Settings (`/[locale]/settings`): Edit business identity, contact details, and branding colors with RBAC restriction (`owner` / `admin` only)
- [x] Quality Gates & Playwright E2E:
  - [x] `pnpm typecheck`: 10/10 packages passing
  - [x] `pnpm lint`: 10/10 packages passing with 0 warnings
  - [x] `pnpm test`: 37 unit tests passing across all 6 test suites
  - [x] `pnpm build`: Both `@darb-rest/web` and `@darb-rest/admin` Next.js 16 production builds passing
  - [x] `pnpm test:e2e`: 9 Playwright tests passing (smoke suite + end-to-end 7-step onboarding flow with post-onboarding locations & settings inspection)
  - [x] `pnpm format:check`: 100% Prettier compliance

---

## Database Reconciliation Gate — 2026-09-19

- [x] Verified linked Darb_Rest project and backed up schema/data to ignored temporary storage.
- [x] Verified migrations 1–2 already existed; repaired their history only.
- [x] Verified migration 3 was absent; applied it once using CLI push.
- [x] Linked migration history matches all three canonical timestamps.
- [x] Reproduced invalid UUID and time-order seed errors and corrected local seed data.
- [x] Added local PostgreSQL 17 configuration and updated the existing database type contract.
- [x] Two clean `supabase db reset --local` runs passed; direct seed reapplication passed without duplicate operating hours.
- [x] Final local and remote history match all three timestamps; public schema diff is empty and catalogs match.
- [x] Remote push dry-run is up to date, with no pending migrations, seeds or roles.
- [x] Local and remote public-schema lint: no errors.
- [x] Full validation: typecheck, lint, test (39 tests), build, test:e2e (18 tests), format:check all passed.
- [x] Reconciliation complete; Phase 4 remains unstarted.

Future remote schema changes use migration files plus `supabase db push`, never manual SQL Editor migration execution. See [DATABASE.md](./DATABASE.md) for recovery evidence and the safe local-reset workflow. Phase 4 has not begun.

---

## Phase 4: Restaurant Content Core (Complete)

- [x] Canonical migration 4: business menus, branch assignments, sections, dishes and RLS
- [x] Multilingual AR/HE/EN content, prices, absolute variants and reusable modifiers
- [x] Structured dietary tags/allergens and restaurant-information disclaimer
- [x] Nullable branch overrides, visibility/availability and accessible ordering controls
- [x] Private optimized WebP uploads with replacement/removal cleanup and tenant policies
- [x] Admin menu home, focused editors, real authenticated saves and guest-style preview
- [x] Audit events for creation, publication/archive and assignments
- [x] Generated database types and development seed; repeated clean local resets pass
- [x] 18 real database permission/constraint/transaction tests and clean local/remote lint
- [x] 50 unit tests; 21 Playwright E2E tests, including real local Auth/content/media
- [x] Typecheck, lint, production build and formatting checks
- [x] 108 responsive checks across 375/390/430/768/834/1024/1280/1440/1600 in AR/HE/EN
- [x] Screenshots reviewed; native dialog keyboard focus, reduced motion and script fonts verified
- [x] Remote migration 4 applied without seeds; all four history records match; push dry run is empty
- [x] Remote public schema diff reports no changes

Local development navigation QA (81 loads): 414 ms median, 442 ms maximum, including font
readiness. This is local development evidence, not a production latency guarantee.
Screenshots and diagnostics remain ignored under .tmp/ui-qa/phase4 and .tmp/phase4.

Architecture and limitations: [MENU-ARCHITECTURE.md](./MENU-ARCHITECTURE.md).
Phase 4 introduced the authenticated owner preview. Phase 5 below adds public guest ordering;
scheduling and galleries remain future work.

---

## Phase 5: Ordering Core (Complete)

- [x] Guest business/branch URL with no customer account and published-only menu projection
- [x] Shared mobile item configuration, variants, modifier validation, cart quantity/remove/review
- [x] Integer-money client estimates and independent authoritative database pricing
- [x] Server draft persistence, empty-draft clearing, confirmation recovery and idempotent submission
- [x] Dine-in/takeaway with minimum customer details
- [x] Immutable line/modifier snapshots, tenant RLS and guest capability isolation
- [x] Validated order status transitions and admin list/detail with pagination/filters
- [x] AR/HE/EN dictionaries, existing script fonts, RTL and keyboard-focused dialogs
- [x] 15 locale/width visual QA combinations covering menu, configuration and cart
- [x] 60 unit tests, 52 database tests and 24 E2E tests pass
- [x] Typecheck, lint, production build and formatting checks
- [x] Mobile/desktop admin list and order detail reviewed
- [x] Remote migration 5 applied without seeds; all five history records match
- [x] Remote public diff is empty, local/remote lint is clean and push dry run is up to date
- [x] Repeated clean local resets and documentation sign-off

See [ORDER-ARCHITECTURE.md](./ORDER-ARCHITECTURE.md). Payments, QR, table management, kitchen
display, delivery and other later-phase features were excluded from Phase 5. Phase 6 follows below.

---

## Phase 6: Payments & Checkout (Complete — remote migration pending operator application)

- [x] Separate mobile checkout after guest cart review; AR/HE/EN copy and RTL
- [x] Provider-neutral server interface and environment-driven local-only test adapter
- [x] Online payments explicitly unavailable in production without a live adapter
- [x] Atomic order/payment linkage with authoritative amounts and idempotent submission
- [x] Payment intent, reference metadata, state transitions and callback event ledger
- [x] Signature verification, webhook replay handling and amount/currency/reference checks
- [x] Guest pending/success/failure/cancellation/refund states and confirmation recovery
- [x] Admin payment status and permission-checked restaurant collection acknowledgment
- [x] Local migration/types; no remote push, repair, migrations or seed operations
- [x] Typecheck/lint across 11 packages, 65 unit tests and both production builds
- [x] 87 database tests and clean local public-schema lint; repeated clean local resets
- [x] 29 E2E tests, including restaurant collection and online success/failure/refund
- [x] 15 checkout locale/width checks, keyboard focus/Escape, mobile/desktop admin detail review
- [x] Production-server check confirms test provider is disabled with explicit unavailable copy
- [x] Formatting and architecture/database documentation complete

See [PAYMENT-ARCHITECTURE.md](./PAYMENT-ARCHITECTURE.md). Live gateway selection remains deferred.
QR, table and kitchen work has not started.

---

## Phase 7: Tables, QR & Dine-in Context (Complete)

- [x] Branch-owned tables, names/areas, active state, archive and optimistic revisions
- [x] Manager-only QR generation, revocation and regeneration with 256-bit tokens
- [x] Public QR entry resolves active business/branch/table without customer accounts
- [x] Validated table context through cart, drafts and checkout; takeaway has no table linkage
- [x] Immutable table name/area snapshots on orders and admin detail visibility
- [x] Branded AR/HE/EN print cards, PNG/SVG downloads and 24-card print/PDF batches
- [x] Migration 7 and existing type contract updated; migration applied by the operator
- [x] Focused unit, database and browser test cases added
- [x] Typecheck/lint across 11 packages, 70 unit tests, production builds and formatting
- [x] Real PNG QR decoding in AR/HE/EN and mobile malformed-QR error states
- [x] Migration/test SQL parser-only syntax checks (no SQL execution)
- [x] Full valid-QR/table/print visual review after operator migration application
- [x] E2E completion: all 33 tests passed
- [x] Operator applied migration 7; all 120 database assertions and real QR integration passed

See [TABLE-QR-ARCHITECTURE.md](./TABLE-QR-ARCHITECTURE.md). Kitchen/KDS has not started.

### Phase 7 validation follow-up — 2026-09-19

The operator reports migration 7 applied and verified remotely. No remote commands or
migrations were run during this follow-up. The isolated local database still lacks
`restaurant_tables`, `table_qr_tokens`, the table RPCs and `orders.table_id`, so remote
application has not unblocked local integration validation.

- Final typecheck, lint, 70 unit tests, build and format check pass (Turbo reused valid caches).
- Database tests: the 87 preceding assertions pass; the table suite stops on missing
  migration 7 objects. Payment test queries were scoped to their fixture order so
  existing local E2E payments no longer contaminate assertions or callback setup.
- Full E2E: 27 pass, 6 fail on migration-dependent ordering/payment/table flows.
- Invalid QR screens checked in AR/HE/EN at 375, 430 and 1440px: correct direction,
  no horizontal overflow; mobile screenshots visually inspected. QR image decoding
  passes for all three locales.
- Remaining: operator must prepare the local test database with migration 7 before
  table lifecycle/revocation, dine-in versus takeaway linkage, valid QR entry and
  printable table-card visual QA can be completed. Phase 7 remains validation-pending.

### Phase 7 validation complete — operator-prepared local database

After the operator applied migration 7 locally, all 120 database assertions and all 33 E2E tests
pass. Typecheck, lint, 70 unit tests, both builds and format check pass. Valid QR entry, old-token
revocation, dine-in snapshots and takeaway separation are verified. Table management, QR cards
and guest entry pass AR/HE/EN responsive checks at 375/430/1440px. Exported A4 cards were visually
reviewed in each locale; print-only controls and card stretching were corrected. Physical printer
and camera scanning were not tested. This supersedes the earlier migration-blocked validation
record. No migrations or remote commands were run; no schema or Phase 8 work was performed.

## Phase 8: Kitchen / KDS & Order Operations (Complete)

- [x] Active-branch board with authenticated server/RLS authorization and paginated snapshot feed
- [x] Minimal Supabase Realtime branch signals, reconnect refetch and 15-second polling fallback
- [x] Validated sequential operations, revision conflicts, action-UUID retries and actor audit
- [x] Reject/cancel reason foundation; existing payment guard and order flows preserved
- [x] Order age, dine-in/table versus takeaway, variants/modifiers and accessible detail dialog
- [x] Visual arrival notifications, opt-in sound, status filters and AR/HE/EN responsive layouts
- [x] Migration 8 and existing types authored only; no migrations or remote commands executed
- [x] Typecheck, lint, 76 unit tests and both production builds
- [x] Browser client/transport checks and visual review at 375/834/1440px in all three languages
- [x] Operator applied migration 8; all 148 database assertions and 39 E2E tests pass

Final validation after operator application: all 148 database assertions and 39 E2E tests pass.
Real authenticated Realtime delivery and the full status workflow are verified; an anonymous-join
race was fixed by awaiting the browser session and explicitly binding the JWT before subscription.
Real polling with blocked WebSockets and fixture-based reconnect catch-up pass. Real-data AR/HE/EN
boards/details were visually checked at 375/834/1440px. Typecheck, lint, 76 unit tests, both builds
and formatting pass. No migrations, schema changes or remote commands were run in this follow-up.
See [KDS-ARCHITECTURE.md](./KDS-ARCHITECTURE.md). Physical device/audio and production load tests
remain outside this local validation. No Phase 9 work has begun.

## Phase 9: Advanced restaurant operations (Complete)

- [x] Branch stations, item/category routing, independent station tasks and station KDS views
- [x] Rush priority, operational timestamps, branch staff roster and order/table assignment
- [x] Table operational states, per-user notifications, printer-event adapter boundary and audit
- [x] Existing KDS reused; server/RLS authorization, revision conflicts and action-UUID retries
- [x] Migration 9 and existing database types authored; no migrations or remote commands executed
- [x] AR/HE/EN responsive transport-fixture coverage at 375/430/834/1440px
- [x] Operator application of migration 9 and database-backed Phase 9 validation

Initial implementation handoff (superseded by the validation record below):
See [RESTAURANT-OPERATIONS.md](./RESTAURANT-OPERATIONS.md). Migration 9 was then unapplied locally.
Existing 148 database assertions pass; the new suite cannot initialize its RPC helper because
restaurant_operation does not yet exist. This is an explicit integration-validation limitation,
not a passing Phase 9 database result. No analytics or later-phase work was started.

Final Phase 9 checks: typecheck, lint, 83 unit tests, both production builds and format check pass.
Full E2E: 42 pass; the single real operations integration test fails on the expected missing
migration 9 RPC (HTTP 503). The three new transport-fixture tests pass across EN/AR/HE and
375/430/834/1440px; setup and mobile station views were visually inspected. Database testing
reports 148 preceding assertions passing and the new suite blocked before assertions. Migration
SQL and the four non-trigger procedural bodies parse offline; this does not replace database
execution. Runtime routing, writes, constraints and triggers still require operator-prepared schema
validation. Physical devices/audio/printers and production load were not tested.

### Phase 9 validation complete — operator-prepared database

The operator applied migration 9 locally and remotely. All 205 local database assertions pass,
including 57 restaurant-operations assertions. These verify routing precedence/fan-out, inactive
station fallback, independent item preparation, rush ordering/idempotency, branch/tenant isolation,
assignment permissions, table states/occupancy, operational timestamps and printer-event creation.

The older QR test assumed table revision stayed at 1 after a dine-in submission. Occupancy now
increments it legitimately; regeneration/archive tests now read the current revision. No application
or schema change was needed.

All 43 E2E tests pass. The real operations test now creates a station/rule, submits a guest order,
verifies automatic station routing, marks rush, advances item preparation, reads printer/audit
records, completes the order and deactivates the station. Other-tenant access is denied and the
sibling branch never sees the station. Actual-data boards in EN/AR/HE were visually reviewed at
375/430/834/1440px with correct direction and no overflow; setup/history/printer panels were also
reviewed. Existing QR, payment, guest-order and KDS flows remain green.

Typecheck, lint, 83 unit tests, both production builds and format check pass. Validation was local;
no migrations, resets, remote commands or schema changes were run. Physical tablet/audio behavior,
printer hardware and production load remain untested. No analytics or Phase 10 work was started.

## Phase 10: Template engine and public restaurant experience (Validated)

- [x] Extensible metadata/component registry with eight structurally different starter templates
- [x] Shared menu projection and existing ordering/configuration/checkout/QR engine reused
- [x] Root business-slug route, deterministic active branch context, real hours/contact/socials
- [x] Owner/admin Appearance → Templates, visual style browsing and real-data device previews
- [x] Controlled safe theming, script fonts, density, menu images and cover/video readiness
- [x] Draft/published snapshots and revision/RLS/RBAC persistence migration authored only
- [x] Operator application of migration 10 and database-backed publication validation

See [TEMPLATE-ARCHITECTURE.md](./TEMPLATE-ARCHITECTURE.md).

Phase 10 validation: typecheck, lint, all 90 unit tests and both production builds pass.
The full E2E suite reports 47 passing tests and one blocked draft/publication persistence test:
local migration 10 has intentionally not been applied. All 205 pre-existing database assertions
pass; the new 14-assertion appearance suite cannot run until its table/RPC exist. Migration SQL
was checked offline for syntax, which does not replace database execution.

All eight templates were exercised with real branch menu data and the shared configuration/cart
flow in EN/AR/HE. Responsive checks cover 375/430/834/1440px, LTR/RTL and no horizontal overflow;
representative screenshots were visually reviewed. Public slug resolution, invalid branch rejection
and private preview authorization pass. Draft/publish isolation and database concurrency/RLS still
require the operator-applied migration and a rerun of the database/E2E suites.

No migrations, resets, remote schema commands or deployment were performed. Media customization
currently accepts safe HTTPS references; integrated cover/logo uploads and physical-device/media
playback testing remain outside this validation. No later-phase work was started.

### Phase 10 validation complete — operator-prepared database

After operator application of migration 10, all 219 local database assertions pass, including
14 appearance assertions covering draft/publication isolation, persisted selection, optimistic
revision conflicts, unsafe settings and tenant/role enforcement. All 48 E2E tests pass. The
publication test now exercises every published template in EN/AR/HE on both seeded branches,
configures and reviews real menu items, and saves/reloads/submits an order for each template.
Private previews exercise the owner's real data in mobile/tablet/desktop modes; all eight layouts
pass 375/430/834/1440px overflow and direction checks, with representative visual review.

Typecheck, lint, all 90 unit tests, both production builds and format check pass. Contrast and
unsafe theming/URL rejection tests pass. No application/schema repair was needed; changes are
limited to expanded validation coverage and documentation. No migrations, resets, remote commands
or Phase 11 work were performed. Physical-device/browser coverage beyond Chromium, production
load/deployment and external video playback remain unverified; HTTPS media references remain the
supported logo/cover customization mechanism.

### Dedicated local test account fixture

Added the manual `pnpm seed:test-account` workflow and [operator instructions](./TEST-ACCOUNT.md).
Auth credentials come only from environment variables; production and remote endpoints are blocked.
The fixture uses deterministic IDs, one public-data transaction, stable private media paths and
insert-only operational history/orders. It includes a full owner business, two branches and five
separate role-testing businesses without platform-admin access. No schema or seed.sql changes.
The seeder has not been executed; Auth/Storage/database integration awaits the operator's manual run.

### Self-service product review — 2026-09-20

Completed a manual local-fixture audit; see [findings and ranked recommendations](./SELF-SERVICE-AUDIT.md).
Owner template draft/publish, eight layouts in EN/AR/HE, 390/834/1280px preview modes, availability
updates, six tenant roles and direct cross-tenant order rejection were reviewed. New takeaway and
QR dine-in orders reached Central KDS, with Garden isolated; revoked QR was rejected. The operator's
full fixture installation is now confirmed through the UI, superseding the earlier “not executed”
implementation note (The implementation did not execute the seeder).

Product health: strong shared operational foundation, but premium self-service needs an incremental
polish pass. High-priority findings are lost order context on post-submit language switching,
selected-branch navigation dropping QR context, URL-only branding media, competing branding editors
and unclear closed-hours ordering policy. Additional findings cover publishing feedback, preview
usability, empty categories, media save semantics, role labels and restaurant SEO foundations.

Recommended next work is controlled self-service/customer-continuity polish mapped to Phases 4–10,
not an automatic new major phase. No application code, migrations, remote commands or major features
were changed. Original appearance and sold-out fixture state were restored; two named fictional audit
orders remain. Manual coverage and remaining limitations are explicit in the audit document.

## Self-service polish increment — implementation complete, media validation pending

- Context-aware language/current-branch navigation retains QR/table, cart, saved draft and order
  confirmation. EN → AR → HE → EN mobile regression verifies draft details and confirmation;
  revoked QR tokens still fail after navigation/reload.
- Appearance is the sole customer-facing branding editor. Settings retains business/regional/contact
  fields. Dirty/saved/live/private-preview feedback and restore-published controls are explicit.
- Closed-hours copy now explains the existing immediate submission/restaurant-acceptance policy;
  no scheduling or new rejection rule was introduced.
- Managed logo/cover uploads optimize bounded JPEG/PNG/WebP into immutable WebP assets, with private
  preview, tenant/role isolation and published-reference-only public delivery. Legacy URLs work.
- Migration **20260920000011_branding_media.sql is authored only and requires operator application**.
  No migrations, reset, push, repair or remote seed/schema commands were run.
- Validation: typecheck, lint, unit tests and production build pass. Full E2E: 49 passed, 1 failed at the managed-upload check after template publication coverage.
  All eight templates retain multilingual/mobile coverage; managed-upload completion remains blocked by
  the unapplied private Storage bucket/policies. This is not a fully green deployment sign-off.
- Follow-up: manually apply migration 11 locally, rerun `pnpm test:e2e`, and verify managed upload,
  replace/remove and draft/public asset boundaries before deployment. Old private asset cleanup is
  deferred; removal never deletes an asset still used by the published appearance.

See [audit resolutions](SELF-SERVICE-AUDIT.md#self-service-polish-increment--2026-09-20) and
[managed-media architecture](BRANDING-MEDIA.md). No next major phase was started.

## Migration 11 validation follow-up — 2026-09-20

The operator reports migration 11 applied locally and remotely. Local managed-branding validation
now passes for logo and cover upload, authenticated preview, replacement, draft-only privacy,
published delivery, draft removal preserving live assets, and publication revoking old public
references. Editor/foreign-tenant/invalid-file rejection checks pass. The E2E helper now waits for
the editor to be interactive and reads the collapsed legacy fields by label; no application or
schema change was needed. This supersedes the earlier migration-related validation block.

All eight templates retain EN/AR/HE responsive and RTL coverage (375/430/834/1440 widths and
preview device modes). Representative rendered screenshots were inspected. Validation remains
local Chromium-based, not a remote deployment or physical-device/cross-browser certification.
Private orphan-object cleanup remains deferred. No migrations or remote database commands ran.

Final validation: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`,
`pnpm test:e2e` (**50 passed**) and `pnpm format:check` all pass. Self-service polish validation
is complete; no new phase started.

## Phase 10.x — Template Excellence & Self-Service UX (validated)

This focused increment follows completed Phase 10 and self-service polish, before Phase 11.
The existing roadmap and operational stack are unchanged. Analytics will not begin automatically.

- Audited all eight template structures, owner controls, guardrails and existing responsive renders;
  classifications and decisions: [Phase 10.x audit](PHASE-10X-AUDIT.md).
- Added optional bounded composition controls: cover emphasis/focal point, category navigation,
  card treatment, information position, CTA style, footer contact detail and surface mood.
- Added safe brand palettes, edit/preview shortcuts and grouped controls. Existing menus screen
  remains the sole authority for category/item ordering. Template switching retains data/options.
- Refined template-specific mobile/desktop rhythm and Arabic/Hebrew headline spacing; existing
  Cairo/Heebo/Ubuntu typography stays intact. Empty sections no longer crowd public navigation.
- Managed cover derivatives, safe crop presets, image-failure fallbacks and corrected video posters
  improve media delivery. No arbitrary external URL proxy or public draft asset access was added.
- Migration 12 was applied by the operator. Local composition persistence now passes; historical migrations are unchanged.
- Audit and new architecture details: [template architecture](TEMPLATE-ARCHITECTURE.md#phase-10x--template-excellence--self-service-ux).

No migrations, resets, push, repair, remote seed or remote schema commands were run.

Phase 10.x post-migration validation: `pnpm typecheck`, `pnpm lint`, `pnpm test`,
`pnpm build`, `pnpm test:e2e` (**56 passed**) and `pnpm format:check` pass.
Local composition database tests pass **24 assertions**, including exact draft/published palette
and all eight composition values, tenant permissions, stale revisions and unsafe-option rejection.
All eight templates retain public ordering coverage in EN/AR/HE. Preview switching preserves a
configured cart; branch/QR, revocation, payment and operational regression tests pass. Responsive
screens cover mobile, tablet and desktop; same-template palette/card variation and media focal,
derivative, loading failure and draft/public access checks pass.

Remaining evidence limits: local Chromium and synthetic fixture media; physical devices,
cross-browser certification, photographic art direction and production media load remain unverified.
No migrations or remote commands were run during validation. No Phase 11 work started.

## Phase 11 — Analytics & Business Intelligence (validated)

- Added the real-data analytics dashboard with business-timezone date range and branch filters,
  daily/hour/day demand, branch comparison, top item quantity/value, order value and collected
  payments, payment method/status, dine-in/takeaway, cancellation/rejection and service timings.
- Added read-only aggregate RPC and supporting indexes in migration 13, authored only. Explicit
  tenant/branch/role checks protect both dashboard and daily CSV export. No operational data model
  or existing order/payment/QR/KDS behavior was changed.
- All money is separated by currency. Snapshots drive item value; recorded timestamp samples drive
  averages. Drafts, refunds, cancellations and legacy missing history have explicit semantics.
- EN/AR/HE copy and responsive presentation reuse existing fonts and RTL/layout conventions.
- Operator-applied migration 13 passes all 27 local analytics database assertions. Browser checks
  explicitly cover populated real-order reports, CSV content/download, date/branch filters and
  EN/AR/HE responsive layouts. The analytics alert selector now excludes Next.js's route announcer.
  No application or schema correction was required.
- Details and validation evidence: [analytics architecture](ANALYTICS-ARCHITECTURE.md).

No migrations, resets, db push, repair, remote seeds or remote schema commands were run.
No work beyond Phase 11 was started.

Final validation: `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`,
`pnpm test:e2e` (**59 passed**) and `pnpm format:check` all pass. Phase 11 validation is complete.
Local Chromium screenshots were reviewed; physical-device/cross-browser and production-load
validation remain limitations. No next phase was started.

## Phase 12 — Production launch foundations (implementation; migration validation pending)

- Added owner/admin publication controls, verified domain ownership and active/canonical domain
  management, with exact-host binding and platform-link fallback through the existing engine.
- Added localized restaurant metadata, social cards, canonical/alternate URLs, escaped Restaurant
  JSON-LD, robots and a paginated published-branch sitemap. Private order/table context is noindex.
- Public visibility checks cover menus, pages, QR, guest mutations and media. Managed media retains
  authorization before bounded derivative reuse; public dish delivery no longer issues new signed
  Storage URLs. Existing issued links expire according to their original lifetime.
- Kept public HTML/media request-time/no-store, making the next request after publication read
  current state without cross-app invalidation secrets or caching guest capabilities.
- Added production origin/key validation, sanitized server-error events, response headers, a
  distributed production mutation budget and operator-run deployment smoke tooling/checklists.
- Migration `20260920000014_production_launch.sql` is authored only. No migrations, resets, pushes,
  repairs, remote seed or remote schema commands were run. No deployment or live DNS mutation ran.
- Live gateway integration and later roadmap work remain outside this phase.

See [production architecture](PRODUCTION-ARCHITECTURE.md) and [custom domains](CUSTOM-DOMAINS.md).

Validation before operator application of migration 14:

- `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm format:check` pass.
- `pnpm build` passes with explicit public/admin HTTPS origins supplied for the build. An
  unconfigured production build correctly rejects a missing public origin. Build-check origins
  are placeholders and must be replaced for deployment.
- Full `pnpm test:e2e`: **63 passed, 2 failed**. Both failures are migration-gated: the published
  sitemap RPC and owner domain controls require migration 14. Existing ordering, payment,
  tables/QR, operations, analytics and multilingual template regressions pass.
- Fixed an existing kitchen E2E pagination wait to match the requested offset instead of racing
  an unrelated realtime refresh; the real database kitchen workflow passes in the full rerun.
- Local `supabase test db supabase/tests/launch.test.sql` was attempted and is blocked by absent
  migration 14 objects. New domain/publication/budget database assertions are not yet certified.
- Production DNS/TLS/ingress, deployment smoke checks and load testing remain operator launch
  gates. Phase 12 implementation is committed; production readiness is not yet certified.
