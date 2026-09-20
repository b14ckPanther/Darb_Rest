# Darb REST

Darb REST is a multilingual, multi-tenant restaurant and café platform within the **Darb**
ecosystem. It is an independent product with a public restaurant application, an owner/staff
console and a dedicated database and authorization model.

The platform connects restaurant content and branding to guest ordering and branch operations.
Owners manage the public experience through controlled settings, while a shared engine handles
pricing, availability, checkout, table context and operational state.

## Product capabilities

- **Self-service restaurant websites:** eight structurally distinct templates, real-data previews,
  mobile/tablet/desktop preview modes, draft/publish boundaries and managed logo/cover uploads.
  Curated palettes, hero emphasis, focal points, navigation, cards, density and footer controls
  provide customization without arbitrary scripts, styles or fonts.
- **Multilingual experience:** Arabic, Hebrew and English, RTL/LTR layouts and Cairo, Heebo and
  Ubuntu typography, including mixed-language restaurant content.
- **Menu management:** menus, categories, dishes, imagery, variants, required/optional modifiers,
  dietary/allergen information, branch assignments, price overrides and availability controls.
- **Guest ordering:** account-free item configuration, carts, draft orders, dine-in and takeaway.
  The server recalculates totals and stores item/configuration/price snapshots.
- **Checkout foundations:** pay at restaurant, provider-neutral payment adapters, payment records,
  signature verification, idempotent callbacks and guest payment states. A local test provider is
  available; live online payments remain disabled until a supported gateway is configured.
- **Tables and QR:** branch-owned tables, opaque revocable QR tokens, validated dine-in context,
  downloadable codes and printable cards.
- **Kitchen operations:** branch-scoped live order boards, polling recovery, validated transitions,
  cancellation reasons, preparation stations, item routing, rush priority, staff assignments,
  table states and audit history. Printer events are an abstraction, not a hardware integration.
- **Multi-branch access:** business memberships and role-based controls backed by database checks
  and row-level security. Branch rosters do not grant independent tenant access.
- **Analytics:** date/branch filters, order value and collected payments, payment and fulfillment
  breakdowns, top items, busy periods, service timings, branch comparisons and daily CSV export.
  Monetary figures remain separated by currency; these are operational reports, not accounting.

Restaurants can use the same system for a dining room with kitchen stations, a café with drink
variants, or a compact takeaway menu. Templates change presentation without duplicating ordering
logic or changing operational records.

## Architecture

```text
Guest application ─┐
                   ├─ Shared types, validation, presentation and payment contracts
Owner/staff console┘                         │
                                  Authenticated server boundaries
                                             │
                                Supabase Auth / PostgreSQL / Storage
                                RLS + transactional RPCs + Realtime
```

Business membership is the tenant boundary; locations scope branch operations. Sensitive server
credentials stay server-side. Public restaurant projections expose published customer-facing
content, while guest capabilities protect order and table context. Realtime messages trigger
refreshes of authoritative data rather than replacing database authorization.

### Monorepo

```text
apps/
  web/             Public restaurant experience and product website
  admin/           Owner, manager and staff console
packages/
  config/          Workspace configuration and environment contracts
  design-tokens/   Shared visual tokens
  i18n/            Dictionaries, locale handling and direction
  icons/           SVG icon components
  payments/        Provider interface and local test adapter
  supabase/        Browser/server clients, database types and entitlements
  types/           Shared domain models and calculations
  ui/              UI primitives, templates and ordering presentation
  validation/      Input and customization validation
supabase/
  migrations/      Canonical database history
  tests/           Transactional database assertions
  seed.sql         Local development data
scripts/           Local fixture and test runners
e2e/              Browser integration coverage
docs/             Architecture, validation records and roadmap
```

### Technology

Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, PostgreSQL/Supabase, Zod,
Lucide SVG icons, Sharp image processing, pnpm workspaces and Turborepo. Validation uses
Vitest, Playwright and database assertions through pgTAP.

## Local development

### Prerequisites

Use Node.js 22 or a compatible newer release, the pnpm version pinned in `package.json`,
Supabase CLI and a running Docker-compatible container runtime.

```bash
pnpm install
supabase start
```

### Environment

Next.js reads environment files from each application directory:

```bash
cp .env.example apps/web/.env.local
cp .env.example apps/admin/.env.local
supabase status
```

Populate each application's ignored file with the **local** API URL and keys reported by the
local runtime. Never commit real environment values or paste service-role keys into public
configuration. The `NEXT_PUBLIC_*` values are browser-visible; `SUPABASE_SERVICE_ROLE_KEY`
is server-only. Optional payment settings are documented in the example and
[payment architecture](docs/PAYMENT-ARCHITECTURE.md).

Reconstruct the local database from canonical migrations and development seed data:

```bash
supabase db reset --local
pnpm dev
```

**A local reset deletes local database data.** Do not use a linked reset against a shared project.
The public application runs at `http://localhost:3000`; the admin console runs at
`http://localhost:3001`. Public restaurant routes include the locale and business slug.

For the comprehensive development account, follow [the manual fixture workflow](docs/TEST-ACCOUNT.md).
It reads credentials from the environment, refuses remote/production execution and is separate
from database resets. The ordinary seed does not provision that authentication account.

### Build and validation

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm format:check
```

With local Supabase running and all canonical migrations applied:

```bash
supabase test db
pnpm exec playwright install chromium
pnpm test:e2e
```

Browser tests use isolated local-backed servers on ports 3100/3101 alongside the development
shells. The test harness provisions fictional local fixtures; it does not target the linked
remote project. See the architecture documents for test scopes and validation limitations.

## Database workflow

Schema changes belong in versioned migrations. Preserve applied migration history; do not
manually replay migration files in the remote SQL Editor.

```bash
supabase migration new describe_change
# Edit the generated migration, then validate locally:
supabase db reset --local
supabase test db
```

An authorized operator should verify the intended linked environment and pending changes before
applying a remote update:

```bash
supabase migration list
supabase db push --dry-run
supabase db push
supabase migration list
```

Never include development seed data in a production push. Backup and deployment review remain
operator responsibilities. [Database documentation](docs/DATABASE.md) explains schema ownership,
RLS, history reconciliation and the established workflow.

## Current status and roadmap

Implementation and local validation cover the canonical roadmap through **Phase 11: Analytics &
Business Intelligence**, including the Phase 10.x template and self-service increment. The latest
validation record includes 59 browser tests and 27 analytics database assertions. This is local
Chromium and fixture-based evidence, not a claim of production load or cross-browser certification.

Future work remains governed by [the canonical progress record](docs/PROGRESS.md). Deployment
hardening, production performance measurement, broader device/browser coverage and selecting a
live payment gateway remain practical integration work. Inventory, delivery, reservations,
loyalty, accounting integrations and advanced forecasting are outside the implemented scope.

## Engineering documentation

- [System architecture](docs/ARCHITECTURE.md) and [database](docs/DATABASE.md)
- [Menu content](docs/MENU-ARCHITECTURE.md), [ordering](docs/ORDER-ARCHITECTURE.md) and
  [payments](docs/PAYMENT-ARCHITECTURE.md)
- [Tables and QR](docs/TABLE-QR-ARCHITECTURE.md), [kitchen board](docs/KDS-ARCHITECTURE.md) and
  [restaurant operations](docs/RESTAURANT-OPERATIONS.md)
- [Templates](docs/TEMPLATE-ARCHITECTURE.md), [managed branding](docs/BRANDING-MEDIA.md) and
  [self-service audit](docs/SELF-SERVICE-AUDIT.md)
- [Analytics](docs/ANALYTICS-ARCHITECTURE.md) and [implementation progress](docs/PROGRESS.md)
