# Admin navigation performance

## Scope and method

Measured the dashboard and three platform routes with real local Supabase authentication,
a temporary platform administrator with an active restaurant membership, Chromium and a
separate Next development process. Each route had a first request and five warm document
requests. Client navigation used actual links and waited for the destination content.
Temporary accounts were removed. No migrations or remote data mutations ran.

The ordinary admin environment points to remote Supabase. These local database timings
must not be compared directly with the reported remote-backed 463–1681 ms responses.
An unauthenticated probe to the configured Auth endpoint returned 401 in 311 ms initially
and 49–80 ms subsequently. This measures network/service overhead only, not authenticated
query execution or the production database region.

## Response measurements

Milliseconds; warm values are medians of five requests. Full response means browser
Navigation Timing responseEnd minus requestStart, including the streamed body.

| Route                   | First response before → after | Warm full response before → after | Warm TTFB before → after |
| ----------------------- | ----------------------------- | --------------------------------- | ------------------------ |
| /en                     | 555 → 531                     | 102 → 78                          | 22 → 76                  |
| /en/platform            | 398 → 389                     | 101 → 83                          | 24 → 81                  |
| /en/platform/businesses | 330 → 315                     | 82 → 66                           | 24 → 64                  |
| /en/platform/plans      | 317 → 314                     | 89 → 75                           | 25 → 74                  |

The first request includes development route compilation in a fresh process with existing
disk caches; it is not a deployed cold-start benchmark. Local Auth latency varied from
roughly 33 ms to 22–26 ms between runs, so not all response improvement is attributable to
code. TTFB increased because the broad early loading response was removed; completed
content arrived sooner. TTFB alone previously described a placeholder.

Client navigation, two visits per destination:

| Destination             | Before    | After     |
| ----------------------- | --------- | --------- |
| Platform overview       | 125 / 116 | 130 / 93  |
| Businesses              | 89 / 97   | 91 / 92   |
| Plans                   | 86 / 78   | 96 / 80   |
| Dashboard from platform | 828       | 106 / 105 |

A separate controlled check of the loading boundary showed console switches at
815–835 ms with it and 91–104 ms without it. RSC requests completed in roughly 48–83 ms;
there were no document navigations. The broad locale fallback introduced most of this
visible transition delay. Sibling platform navigations were already fast; their small
timing differences are noise, not evidence of a major improvement.

## Query findings

Each requested route already had one Auth call per render, thanks to the existing
React cache wrappers. Platform routes already lived outside the tenant dashboard.
No service-role/Auth Admin API calls occur in these four routes.

| Route                   | Network calls before / after | Before dependency chain                                                                        | After dependency chain                                                               |
| ----------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| /en                     | 7 / 7                        | Auth → profile → platform role → memberships/businesses → locations + entitlements + overrides | Auth → parallel profile/role/memberships → parallel locations/entitlements/overrides |
| /en/platform            | 11 / 11                      | Auth → role → counts → recent businesses                                                       | Auth → role → parallel counts/recent businesses                                      |
| /en/platform/businesses | 4 / 4                        | Auth → role → list + shell membership count                                                    | Auth → role → list + shell membership existence                                      |
| /en/platform/plans      | 4 / 4                        | Auth → role → plans + shell membership count                                                   | Auth → role → plans + shell membership existence                                     |

Representative warm query timings (milliseconds, before → after):

- Dashboard: Auth 33 → 24; profile 4 → 5; platform role 4 → 6;
  memberships with businesses 4 → 7; locations 7 → 7;
  plan entitlements 4 → 6; feature overrides 5 → 5.
  Independent identity reads started at 35/40/45 ms before and together at 27 ms after.
- Overview: Auth 33 → 23; role 4 → 6; seven count reads 14–15 → 9–12;
  recent business read 5 → 20. The latter now starts alongside counts (45 ms),
  instead of after them (71 ms). Parallel queries can individually take longer.
- Business list: Auth 32 → 22; role 3 → 3; list 9 → 8;
  shell membership read 6 → 6.
- Plans: Auth 33 → 26; role 4 → 3; plans with entitlements 9 → 10;
  shell membership read 4 → 4.

No new aggregate schema was warranted. Counts remain exact and parallel. Lists remain
paginated; recent businesses skip their unused exact total. Shell navigation checks for
one membership instead of counting all of them.

## Changes and safeguards

- Shared request-scoped authenticated client and verified user result between tenant,
  content and platform helpers; content pages no longer need a second independent Auth
  round trip after the dashboard layout.
- Platform status remains bound to the Auth-verified user ID. Auth and RLS checks were
  not replaced with client state or unverified session claims.
- Narrow profile and membership selections; direct entitlement module import.
- Independent overview components fetch counts and recent rows concurrently.
- Removed the locale-wide loading boundary. Existing page-specific menus, orders,
  settings and tables loaders remain. Navigation keeps the current console visible
  while the next console resolves.
- Logo dimensions reflect the actual 3:1 header and 866:288 dark assets, with automatic
  width/height scaling. Admin document scrolling is automatic rather than globally smooth.
- Browser regression coverage rejects aspect-ratio/smooth-scroll warnings and verifies
  that switching consoles never removes the main content container.

There is no persistent/global cache of user identity, memberships or platform privileges.
Every new request rechecks authorization. Platform revocation and tenant isolation remain
covered by the real database/browser suite.

## Diagnostics and remaining deployment checks

To collect sanitized timings in a local admin process:

```sh
ADMIN_PERF_TRACE=1 pnpm --filter @darb-rest/admin dev
```

Sign in normally and visit the four routes. Diagnostics emit operation names, durations
and a random per-client correlation value; they never emit URLs, query values, headers,
user identifiers, credentials or returned data. Query events show network duration and
start offset; task events show tenant resolution and platform-guard elapsed time.
The instrumentation is disabled by default.

Next automatic link prefetching runs in production; development results do not certify
production prefetch behavior. Links remain client-side, without forcing eager downloads
of every protected page or extending authorization cache lifetimes.

Before claiming equivalent deployed performance, repeat authenticated measurements on
Vercel. Check that the function region is close to the Supabase project region, then
compare traces with the local dependency chains. Remote Auth/RLS latency, cold starts,
large production datasets and real-device rendering remain deployment measurements.
No region, remote configuration or production data was changed.

Validation: typecheck, lint, unit tests, configured production build, 69 E2E tests and
format check pass. The build uses explicit HTTPS build-check origins; no migration runs.
