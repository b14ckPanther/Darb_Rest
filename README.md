# Darb REST

Darb REST is a multilingual, multi-tenant restaurant and café platform within the **Darb**
ecosystem. It is an independent product with a public restaurant application, an owner/staff
console and a dedicated database and authorization model.

Darb REST v1 gives restaurants a premium digital presence with owner-managed menus,
branding and multilingual templates. Pro adds customer requests through WhatsApp; Business
adds centralized management across locations.

## Product capabilities

- Eight controlled templates with draft/publish previews, managed logo/cover uploads,
  palettes, crop/focal controls, navigation, cards and density options.
- Arabic, Hebrew and English with native RTL/LTR and Cairo/Heebo/Ubuntu typography.
- Menus, categories, dishes, photos, variants/modifiers, dietary information and availability.
- Starter includes complete branding, all templates and menu QR access for one location.
- Pro adds a session cart with server-revalidated totals and structured WhatsApp order and
  reservation requests. Requests are not stored orders or confirmed bookings.
- Business adds branch-specific menus/settings and WhatsApp destinations with tenant RBAC.
- Commercial prices and localized plan copy are database-driven and editable by Platform Admin
  without redeployment. Monthly and yearly prices are independently configured.

See [the v1 commercial model](docs/V1-COMMERCIAL-MODEL.md) for the authoritative scope.
Earlier ordering/payment/KDS/table-operation/analytics/custom-domain implementations remain
**dormant technical foundations**, not available v1 subscription benefits.

## Architecture

```text
Guest application ─┐
                   ├─ Shared types, validation, presentation and validation contracts
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
is server-only. Dormant payment settings must remain unset for the v1 production deployment.

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

The current release is the locked **Darb REST v1** commercial model. Migrations 16 and 17
align the catalog and revoke legacy operational entry points. The retained phase history is
not the subscription offering. See [progress](docs/PROGRESS.md) for validation evidence.

Future work stays subject to explicit roadmap approval. Live payments, stored online ordering,
KDS, inventory, delivery and booking engines are not activated by this release. WhatsApp
requests require the customer to open WhatsApp and send; delivery is not tracked by Darb.

## Engineering documentation

- [System architecture](docs/ARCHITECTURE.md) and [database](docs/DATABASE.md)
- [Menu content](docs/MENU-ARCHITECTURE.md), [ordering](docs/ORDER-ARCHITECTURE.md) and
  [payments](docs/PAYMENT-ARCHITECTURE.md)
- [Tables and QR](docs/TABLE-QR-ARCHITECTURE.md), [kitchen board](docs/KDS-ARCHITECTURE.md) and
  [restaurant operations](docs/RESTAURANT-OPERATIONS.md)
- [Templates](docs/TEMPLATE-ARCHITECTURE.md), [managed branding](docs/BRANDING-MEDIA.md) and
  [self-service audit](docs/SELF-SERVICE-AUDIT.md)
- [Analytics](docs/ANALYTICS-ARCHITECTURE.md) and [implementation progress](docs/PROGRESS.md)

Production launch foundations are documented in [production architecture](docs/PRODUCTION-ARCHITECTURE.md)
and [custom domains](docs/CUSTOM-DOMAINS.md). Migration 14 and deployment-specific DNS, TLS, ingress
and smoke validation remain operator-controlled launch gates.
