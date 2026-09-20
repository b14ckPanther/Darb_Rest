# Production launch — Phase 12

## Public visibility and SEO

Migration 14 adds `restaurant_launch`. Existing active businesses are backfilled as public to
preserve working links; newly created businesses have no launch record and remain unpublished
until an owner/admin publishes them in Publishing & domains. Active business and branch status,
assigned active menus, visible sections/items and published appearance remain the content boundary.
The launch flag is independent of appearance drafts: saving a draft does not publish a site.
Development alone retains legacy public reads when the launch table is entirely absent so earlier
regression fixtures remain testable before operator migration. Production always fails closed;
a missing row after migration is unpublished in every environment.

Pages, public menu loads, QR resolution, draft/checkout actions and media delivery check visibility
and hostname ownership. An unpublished restaurant cannot be recovered through a legacy order URL
or by changing a business slug on another tenant's domain. Payment callbacks remain separate from
public site visibility so future settlement callbacks can still complete for existing orders.

The restaurant route generates localized title/description, canonical and alternate-language URLs,
Open Graph, Twitter metadata and escaped Restaurant JSON-LD. Descriptions combine the real
restaurant name with localized menu/service copy. Hours, contact information and imagery come from
existing public projections and published appearance. No reviews, ratings, cuisine or price ranges
are invented. Private order/table query context is excluded from canonical/structured URLs and
makes the page noindex. Legacy order and QR routes remain noindex. The admin application is noindex.

The configured `NEXT_PUBLIC_WEB_URL` is the fallback origin. A valid active canonical custom domain
can replace it for restaurant SEO. No forced cross-origin redirect is used: guest cookies and carts
are origin-scoped and must not silently migrate to another domain. See [custom domains](CUSTOM-DOMAINS.md).

`robots.txt` excludes capability and API paths; it is not an authorization mechanism. The dynamic
sitemap uses a service-only aggregate projection of public businesses and assigned active-menu
branches, with three locale URLs per branch. It pages 500 database rows at a time, omits URLs whose
canonical host is elsewhere, and fails instead of silently truncating above its bounded capacity.
Partitioned sitemaps are required before exceeding 49,000 emitted URLs or 50,000 branch rows.

## Cache and publication consistency

Restaurant HTML/RSC, sitemap, robots and public media deliberately remain request-time/no-store.
React `cache` deduplicates work only within the current render; no cross-request tenant/guest HTML
cache exists. Thus the next request after menu/appearance publication, unpublication or domain
revocation rereads authoritative state without requiring a fragile cross-deployment invalidation
webhook. Already-open customer screens do not live-refresh branding; order submission still
revalidates current pricing/availability. In-flight reads can complete from their initial snapshot.

Admin launch changes revalidate the admin route. Existing menu/appearance workflows are retained;
there is no duplicate menu engine or separate published pricing model.

Managed branding and dish delivery reauthorize public visibility before each response. Public dish
images use a guarded `/menu-image` route instead of issuing new one-hour Storage capability URLs.
Previously issued signed URLs remain valid until their original expiry; revoke them operationally
if immediate removal of a previously shared image is required. Storage buckets remain private.

Only immutable authorized Storage paths can enter image processing. Bounded 480/960/1440 WebP
sizes, input size/pixel limits and a 32 MiB per-process derivative cache reduce repeated compression.
Authorization always precedes cache reuse. The cache is an optimization, not an access-control or
distributed invalidation mechanism. Public media responses remain no-store, so a CDN must not
independently cache those endpoints. Framework/static immutable assets can use the hosting CDN.
Legacy external image references are not fetched through a generic server proxy.

## Environment and ingress

Set both application origins before production builds and startup:

- `NEXT_PUBLIC_WEB_URL`: exact HTTPS public origin, without path/query/credentials.
- `NEXT_PUBLIC_ADMIN_URL`: exact HTTPS console origin, without path/query/credentials.
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`: public database configuration.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only; never a public variable.
- Public app only: `PUBLIC_RATE_LIMIT_SECRET` (32+ random characters) and
  `TRUSTED_CLIENT_IP_HEADER` (one ingress-owned IP header, such as `x-real-ip`).

Runtime instrumentation fails production startup on missing/placeholder configuration, insecure
origins, private keys in the public key slot or an enabled unsupported payment provider. Build-time
metadata also requires a public origin. No live gateway is enabled. Local development retains the
existing local-only payment adapter. Safe placeholder origins used to verify a build are not deployable
production configuration; configure real origins before creating deployment artifacts.

The ingress MUST preserve the validated original Host without a port, reject unknown host bindings,
strip client-supplied forwarded/identity headers, and overwrite the configured single-IP header.
The application does not trust `X-Forwarded-Host` for tenant selection. Restrict direct origin access
so an attacker cannot bypass ingress header sanitization. Configure body/concurrency limits and
edge protection for page, image, DNS-verification and authentication traffic at the hosting layer.

Production guest mutations use a distributed PostgreSQL fixed-window budget: 60 attempts per IP
per minute, keyed with a server-secret HMAC. Raw IPs are not stored. Missing IP configuration or
budget-store failure rejects the mutation; development tests do not enable production budgets.
Shared NATs share this budget. Expired buckets are removed during budget calls; backup retention
and traffic policy remain operator responsibilities. This is abuse mitigation, not bot elimination.

Response hardening includes no-referrer, nosniff, restricted device permissions, disabled framework
identification and a CSP baseline for frames, object embedding and base URLs. It is not a complete
nonce-based script CSP. Hosting must terminate HTTPS and enforce transport policy.

## Monitoring and smoke checks

Both applications emit sanitized structured server-error events with application, router (public)
and timestamp. Raw errors, URLs, headers, cookies, request bodies and customer information are not
sent to logs. Connect the host's log drain/alerts and define retention before launch. This foundation
does not claim an installed third-party monitoring service or production incident coverage.

`/api/health` reports configuration readiness without disclosing credentials. It is not a database
or external gateway health guarantee. The operator-run smoke script checks health, robots, sitemap,
three restaurant locales and parseable JSON-LD/canonical markup:

```bash
SMOKE_ORIGIN=https://your-public-domain.example \
SMOKE_BUSINESS_SLUG=your-published-restaurant pnpm smoke:deployment
```

It performs reads only. Run it on staging, then the production origin and an activated custom domain.
Use separate deployment projects for public/admin apps, monorepo-aware pnpm installation and the
correct app workspace build/start commands. Secure preview deployments with hosting access controls;
robots exclusions alone do not make a preview private.

## Launch checklist

- [ ] Apply migration 14 locally; run database assertions and full browser regressions.
- [ ] Back up the intended remote database; review pending migration SQL and dry-run output.
- [ ] Apply migration 14 remotely through the canonical CLI workflow; verify history.
- [ ] Configure server secrets and real build-time public/admin origins for both apps.
- [ ] Validate private Storage access, publication/unpublication and cross-tenant host rejection.
- [ ] Configure trusted Host/IP ingress handling, TLS, redirects, body limits and edge protection.
- [ ] Verify DNS TXT ownership and certificate readiness for each domain before activating it.
- [ ] Establish seven-day ownership verification renewal; test expiry/deactivation fallback.
- [ ] Confirm menu/appearance publication, all locales, QR, cart, checkout and pay-at-restaurant.
- [ ] Run deployment smoke checks, real-device/browser QA and representative load tests.
- [ ] Configure log drains, alerts, backups, restore drills and release rollback procedures.
- [ ] Keep live payments disabled until the chosen adapter is implemented and independently verified.

## Validation boundary

Phase 12 database assertions are authored for migration 14 and were attempted locally; execution
is blocked by its absence. No migration or remote command was run. Full validation outcomes are
recorded in [PROGRESS.md](PROGRESS.md). DNS/certificate provisioning, real deployment smoke checks,
load testing and verification of the hosting trust boundary remain operator-run launch gates.
