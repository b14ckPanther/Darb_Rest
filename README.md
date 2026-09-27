# Darb REST

**Digital menus and WhatsApp ordering for restaurants and cafés — in Arabic, Hebrew and English.**

[rest.darb.co.il](https://rest.darb.co.il) · A [Darb](https://darb.co.il) product

---

Darb REST is a multi-tenant SaaS platform that gives restaurants a branded, mobile-first menu
site they manage themselves. Owners pick from nine professionally designed templates, fine-tune
colors and layout, publish their menu in up to three languages and share it through QR codes.
Guests browse, build a cart and send a structured order or reservation request straight to the
restaurant's WhatsApp.

The product runs in production at **[rest.darb.co.il](https://rest.darb.co.il)** and is part
of the [Darb](https://darb.co.il) family of products for local businesses.

## The product

**For guests:** a fast restaurant page at `rest.darb.co.il/<restaurant>` with the menu, photos,
dish options, dietary information, opening hours computed in the branch's timezone, contact
details and a language switcher. Right-to-left Arabic and Hebrew layouts are native, not mirrored.

**For restaurant owners:** an admin console to manage menus, categories, dishes, variants and
modifiers, branch locations, branding and templates. Every appearance change is edited as a draft
and previewed on real content at phone, tablet and desktop sizes before it goes live.

**For the Darb team:** a platform console that reviews incoming restaurant applications, approves
commercial agreements, records manual payments, sends account invitations and edits plan prices
and localized plan copy without a redeploy.

| Plan     | What it adds                                                                                                                       |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Starter  | One location, all templates, full branding, three languages, menu QR codes, rich dishes with variants, modifiers and availability. |
| Pro      | Guest cart with server-verified totals, WhatsApp order requests and WhatsApp reservation requests.                                 |
| Business | Multiple locations with branch-specific menus, hours, contact details and WhatsApp numbers.                                        |

Prices, plan descriptions and limits live in the database, not the code.

## Engineering highlights

- **Tenant isolation in the database.** Every tenant table is protected by PostgreSQL row-level
  security keyed on business membership. Role checks run in `SECURITY DEFINER` helpers with a
  pinned `search_path`, and a trigger prevents a business from losing its last owner.
- **The server owns the money.** Cart totals are recalculated server-side from the published menu
  (variants, modifiers, availability, branch overrides) before a WhatsApp message is generated.
  Prices from the client are never trusted.
- **Draft/publish with optimistic locking.** Appearance settings are saved through a transactional
  RPC that validates every key, takes a per-business lock and rejects stale revisions, so two
  editors can't silently overwrite each other. Publishing copies the draft atomically; public
  pages only ever read the published snapshot.
- **A template engine, not nine copies of a page.** Templates are presentation only. A pure
  metadata catalog declares each template's supported controls, and every template renders the
  same menu model and cart. A semantic theme layer (22 color roles such as page, card, navigation,
  price and footer) sits on top, with tuned defaults for each template.
- **Built for three languages from the start.** Arabic, Hebrew and English with Cairo, Heebo and
  Ubuntu typography, CSS logical properties throughout, direction-aware icons and complete
  dictionary parity. There are no hardcoded UI strings.
- **Safe media handling.** Logos and covers go through a private upload pipeline. Images are
  re-encoded to WebP with bounded responsive widths, and drafts are never exposed on public routes.
- **Production hardening.** Startup validation for the production environment, rate limits on
  public mutations, tenant-aware SEO (canonical URLs, alternate languages, Restaurant JSON-LD,
  a paginated sitemap) and `noindex` on capability URLs and the admin console.
- **Tested at every layer.** Vitest unit suites, pgTAP assertions for RLS and RPC contracts, and
  Playwright end-to-end coverage across locales and viewport widths from 375 to 1440 px.

## Architecture

```text
 Guest site (apps/web)        Admin & platform console (apps/admin)
          │                                  │
          └──────────── shared packages ─────┘
              types · validation · ui · i18n · supabase
                             │
                 Server Components / Server Actions
                             │
        Supabase: Auth · PostgreSQL (RLS + RPCs) · Storage
```

Business membership is the tenant boundary; locations scope branch-level data. The service-role
key stays on the server. Public pages read from narrow projections that only expose published,
customer-facing content.

### Repository layout

```text
apps/
  web/             Public restaurant sites and the marketing website
  admin/           Owner console and Darb platform console
packages/
  config/          Environment contracts and production validation
  design-tokens/   Shared visual tokens
  i18n/            Dictionaries, locale routing and text direction
  icons/           SVG icon components
  payments/        Payment provider interface (dormant in the current release)
  supabase/        Browser/server clients, database types and entitlement resolver
  types/           Domain models, template catalog and theme resolution
  ui/              UI primitives, restaurant templates and ordering flow
  validation/      Zod schemas for every write boundary
supabase/
  migrations/      Versioned schema history
  tests/           pgTAP database assertions
  seed.sql         Local development data
e2e/               Playwright suites
docs/              Architecture and subsystem documentation
```

### Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Supabase (PostgreSQL 17,
Auth, Storage) · Zod · Sharp · pnpm workspaces · Turborepo · Vitest · Playwright · pgTAP.
Deployed on Vercel in the Frankfurt region, next to the database.

## Running locally

Requirements: Node.js 22+, the pnpm version pinned in `package.json`, the Supabase CLI and Docker.

```bash
pnpm install
supabase start

cp .env.example apps/web/.env.local
cp .env.example apps/admin/.env.local
# Fill in the local URL and keys printed by `supabase status`

supabase db reset --local   # rebuilds the local database from migrations + seed
pnpm dev
```

The public site runs on `http://localhost:3000` and the admin console on `http://localhost:3001`.
`supabase db reset --local` wipes local data; never run a reset against a linked project.

For a fully populated development account, see [docs/TEST-ACCOUNT.md](docs/TEST-ACCOUNT.md).

## Testing

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm format:check

# With local Supabase running
supabase test db
pnpm exec playwright install chromium
pnpm test:e2e
```

End-to-end tests start their own servers on ports 3100/3101 against local Supabase with
fictional fixtures. They never touch a remote project.

## Database changes

All schema changes are versioned migrations; applied migrations are never edited.

```bash
supabase migration new describe_change
supabase db reset --local
supabase test db
```

Remote rollout is done by an operator after checking `supabase migration list` and
`supabase db push --dry-run`. See [docs/DATABASE.md](docs/DATABASE.md) for the schema, RLS model
and migration history.

## Documentation

| Topic               | Document                                                                                                                                          |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plans and scope     | [V1 commercial model](docs/V1-COMMERCIAL-MODEL.md)                                                                                                |
| System design       | [Architecture](docs/ARCHITECTURE.md), [Database](docs/DATABASE.md)                                                                                |
| Menus and templates | [Menu content](docs/MENU-ARCHITECTURE.md), [Templates and theming](docs/TEMPLATE-ARCHITECTURE.md), [Branding media](docs/BRANDING-MEDIA.md)       |
| Customer lifecycle  | [Applications](docs/ACQUISITION-ARCHITECTURE.md), [Activation and billing](docs/CUSTOMER-ACTIVATION.md), [Platform admin](docs/PLATFORM-ADMIN.md) |
| Production          | [Production architecture](docs/PRODUCTION-ARCHITECTURE.md), [Vercel regions](docs/VERCEL-REGIONS.md), [Performance](docs/PERFORMANCE.md)          |
| History             | [Progress log](docs/PROGRESS.md)                                                                                                                  |

The repository also contains complete, tested foundations for stored orders, payments, table QR
ordering, a kitchen display and analytics. They are switched off in the current release and
documented in [docs/](docs/) for when they are brought back.

---

© Darb — [darb.co.il](https://darb.co.il). All rights reserved.
Built by [Zangeel](https://github.com/b14ckPanther).
