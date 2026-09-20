# Production performance pass

## Findings and scope

The admin tenant resolver made separate, sequential location, plan and override queries inside
its membership loop. For N active businesses with plans, that is up to 3N requests after the
membership query. It now uses three concurrent batches, paginated in stable order, and maps rows
back to their owning business. Explicit projections replace those three wildcard selections.
RLS, verified authentication and membership-based active-business selection remain intact.
For six businesses with fewer than 1,000 matching rows per table, this reduces these requests
from 18 to 3. This is a code-path count, not a production network trace.

Public restaurant, metadata and ordering loaders repeated publication checks. The authorized
business projection and canonical lookup now use React request-scoped memoization, and the
restaurant loader reuses that projection. Metadata and JSON-LD share the same SEO computation.
There is no cross-request business/authentication cache. Mutation handlers continue checking
publication and prices; React render memoization does not create a persistent authorization cache.

Custom-host robots previously loaded restaurant settings, appearance, branch and hours simply to
obtain the business ID. It now resolves only the authorized business and canonical origin.

The image derivative cache previously received an already-downloaded original. Warm hits still
paid Storage latency and transferred original bytes. It now invokes an original loader only on
cache misses, after the route has authorized the current publication/reference. Width and immutable
path remain part of the cache key. Missing/failed downloads are not cached. Branding requests
without a width now use a bounded 960px derivative rather than the original image.

## Measurements

Local macOS production `.nft.json` trace totals (bytes, not Vercel ZIP sizes):

| Route           |     Before |      After |
| --------------- | ---------: | ---------: |
| robots          |  2,124,902 |  2,046,633 |
| sitemap         |  2,047,047 |  2,047,002 |
| health          |  1,713,860 |  1,713,860 |
| payment webhook |  1,999,460 |  1,999,415 |
| menu image      | 21,216,614 | 21,216,763 |
| branding image  | 21,217,764 | 21,217,276 |

The 18,164,536-byte native libvips binary explains most of the media trace. Non-media routes do
not trace that binary locally. Keep Sharp on Node for image processing; speculative trace exclusions
could break deployment. Vercel's Linux packaging and function grouping must be measured after
redeployment; local traces do not establish its compressed sizes or cold-start times.

An isolated 20-call derivative benchmark reduced original loader calls from 20 to 1. Both took
about 17ms with an in-memory source: this confirms eliminated loads, not a claimed network latency
improvement. Focused tests cover cache reuse, width/path separation, output dimensions and retries.

A local Next production health smoke check returned 200 for 10 warm requests, around 1.2ms median
and 1.8ms maximum. It used non-live build-check configuration and made no database calls. This is
not a benchmark of restaurant TTFB or Vercel cold starts.

## Areas retained and remaining measurements

Build output inspection found 21 web JS chunks totaling 896,187 bytes (largest 228,913), and
34 admin chunks totaling 1,321,249 bytes (largest 254,316). These are uncompressed aggregate
assets, not the JS downloaded by a single route; no before/after client reduction is claimed.

Existing Link navigation, shared admin shell, route loading skeletons, template engine, responsive
media, mixed-script fonts and RTL are retained. No client bundle reduction or LCP/CLS/INP improvement
is claimed. No measured client-chunk bottleneck justified changing hydration boundaries, font
weights or lazy-loading operational panels during this pass.

Public HTML/media stay private/no-store; published content and private media are still authorized
before delivery. Native compression and fresh menu authorization remain costs on cold media misses.
The derivative cache is per process and bounded; it does not persist across serverless instances.

Before assessing production results, align both apps' Vercel Function region with the Supabase
primary region where available. See [Vercel region configuration](https://vercel.com/docs/functions/configuring-functions/region).
Do not add regions merely to move compute away from the single database. Keep Node runtime and
Vercel-managed NODE_ENV. Confirm actual deployed trace sizes and compare warm/cold restaurant,
admin navigation, LCP and interaction timings on the same device/network. No hosting settings,
migrations, remote database operations or deployment changes were performed here.

Validation: typecheck, lint, unit tests (including two derivative tests), production build with
explicit HTTPS build-check origins, all 65 E2E tests, and formatting pass. Browser regressions cover
ordering, publication controls, multilingual templates, tenant roles, media replacement and QR.
