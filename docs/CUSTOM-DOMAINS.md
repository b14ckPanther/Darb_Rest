# Custom domains

## Ownership and lifecycle

An owner/admin registers a normalized ASCII DNS hostname in Publishing & domains. A unique global
hostname constraint prevents two businesses claiming the same host. Five records per business
bound abandoned registrations. The private ownership row contains a cryptographically random
256-bit challenge and pending/verified/active/canonical state. Owners cannot directly update
verification, activate an expired record or claim another tenant's registered hostname.

Publish the exact `darb-rest=<challenge>` value in `_darb-verification.<hostname>` as a DNS TXT
record. The server resolves TXT records through the system resolver with a bounded timeout; it does
not fetch arbitrary HTTP URLs. Exact proof matching grants seven days of verification. The privileged
verification RPC is service-role-only and matches the current row/challenge to avoid stale verification.
Keep TXT in place and renew verification before expiry. No registrar, DNS-writing or certificate
provisioning automation is included.

After installing the hostname and HTTPS certificate on the hosting platform, the operator confirms
readiness and activates it. Certificate readiness is an operator assertion, not an automated TLS probe.
Canonical selection is serialized per business and protected by a unique partial index. Deactivation
immediately removes routing eligibility; removal releases the claim and a later registration creates
a new challenge. Expired proof fails closed even if the stored active flag remains true.

## Request resolution

The public proxy accepts the configured platform host, local development hosts or an exact active,
unexpired verified domain returned by `resolve_restaurant_host`. That public RPC returns only the
public business slug, never ownership challenges or administrative records. Unknown hosts return
404; resolver failures return 503. No arbitrary request hostname becomes a canonical origin.

A custom host's `/` and `/<locale>` rewrite to the same restaurant route/engine. Existing localized
slug, order and QR links remain functional, but the server independently checks requested tenant
against the resolved host on public loads/mutations. Changing path parameters cannot open another
restaurant on that custom domain. Caller-provided internal tenant and forwarded-host headers are
removed; server guards derive host identity independently. The hosting ingress must enforce the
Host/IP contract documented in [production architecture](PRODUCTION-ARCHITECTURE.md).

Canonical origins come only from the configured public origin or persisted active verified domain.
The configured platform slug route remains available as fallback; revoking a custom host does not
redirect an unknown hostname to another tenant. The owner can share the platform link after a
revocation. A custom hostname without canonical selection can serve customers while search metadata
still points to the platform URL. Noncanonical alias sitemaps contain no cross-host entries.

Cookies, order recovery capabilities and cart storage remain scoped to the browser origin. There
is no forced redirect between origins and no guest-session sharing across unrelated domains.
Existing printed platform QR codes remain valid under the existing token checks.

## Migration and validation

`20260920000014_production_launch.sql` introduces launch controls, domain records/RPCs, a published
sitemap projection and distributed mutation budgets. It does not rewrite historical migrations or
change order/payment state machines. Owner/admin RLS and service-only verification protect records.

Database tests cover role/tenant separation, activation before proof, wrong proof, exact-host lookup,
unpublish, inactivity, expiry, sitemap visibility and budget exhaustion. Pure tests reject URL/port,
wildcard/address and malformed host inputs. Browser checks cover canonical metadata, JSON-LD,
forwarded-header spoofing and operator UI availability. Full database/domain resolution validation
requires operator-applied migration 14 and actual DNS/TLS checks remain deployment responsibilities.
