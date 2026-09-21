# Darb REST v1 commercial model

## Status: database prerequisite prepared; application alignment pending

This is the locked commercial specification, not a declaration that the current
application already implements it. Migration 16 has been written but has not been
applied or database-tested. Do not deploy this checkpoint as the finished v1 product.
The previous phase documents describe technical history, not current commercial scope.

## Locked scope

| Plan     | Scope                                                                                                                                                                                                                                                     |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Starter  | One location; premium digital presence; all eight templates, colors, logo, cover, AR/HE/EN, native directionality, menu QR access, rich dishes, variants/modifiers, availability, hours, contact and social information. No cart or reservation requests. |
| Pro      | Starter plus session cart, structured WhatsApp order requests, customer details/notes, lightweight WhatsApp reservation requests and priority support. One location.                                                                                      |
| Business | Pro plus centrally managed locations, branch menus/settings/hours/contact/availability, branch WhatsApp destinations and guided onboarding. Default included-location limit two; commercial limits remain editable.                                       |

No dish/menu quotas are introduced. Branding and template quality belong to every plan.
Reservation requests are messages, not confirmed bookings. WhatsApp order requests do
not create stored orders, payment records, status tracking or kitchen work.

## Audit findings and remaining application work

| Area                   | Existing assumption found                                                                                            | Required alignment                                                                                       |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Database               | Plans have names/descriptions but no commercial price fields                                                         | Migration 16 adds independent monthly/yearly pricing and public metadata                                 |
| Public pricing         | Three localized hardcoded catalogs; Enterprise; Pro ordering readiness and branch/branding differentiation           | Read active database catalog, monthly/yearly toggle, Pro emphasis, conditional From                      |
| Homepage and metadata  | Copy advertises unlocking ordering/payments; restaurant metadata advertises ordering                                 | Rewrite EN/AR/HE for digital presence and lightweight actions                                            |
| Terms                  | Bespoke Enterprise agreements and multi-unit SLAs                                                                    | Remove unsupported commercial promises                                                                   |
| Onboarding             | Fixed plan UUIDs, names, descriptions/features; Pro multi-branch and premium branding                                | Use active database catalog and preserve approved plan context                                           |
| Applications           | Enterprise in validators, form options, review UI, SQL check and review RPC                                          | Migration updates persisted codes/RPC; UI/types/validation still pending                                 |
| Platform Plans         | Read-only plan cards with raw legacy feature flags                                                                   | Build authorized editor for commercial fields, v1 entitlements and limits                                |
| Entitlements           | Starter branding absent; Pro three branches; Business predecessor 25; online ordering/payments/table/takeaway grants | Canonical plan grants replaced by eight v1 capabilities; runtime v1 allowlist still required             |
| Feature overrides      | Legacy overrides can still enable operational capabilities                                                           | Preserve records but prevent dormant features from entering v1 resolution                                |
| Navigation/public flow | Orders, kitchen, operations, analytics, tables and old checkout remain accessible                                    | Hide navigation and enforce server-side dormant-route/action boundaries; retain menu QR                  |
| Test account           | Full-access development plan enables legacy operations                                                               | Separate dormant regression fixture from v1 commercial fixture; do not use it to validate v1 permissions |
| Documentation          | Architecture/README/phase history describe full operations as product                                                | Add v1 scope labels and update current-product descriptions without erasing history                      |

## Database contract prepared

`plans` remains the only commercial source of truth. Migration 16 adds:

- `monthly_price_ils`, `yearly_price_ils`: independent non-negative numeric values.
- `price_is_starting`, `display_order`; existing `is_active` is reused.
- Existing localized `name` and `description` are reused.
- Localized `public_features` and `billing_note` support editable commercial copy.
- Existing `plan_entitlements` remains separate from commercial copy and prices.

The public `public_commercial_plans()` RPC projects only active Starter/Pro/Business
plans and the eight v1 capabilities. It exposes no tenant records. Pricing must be
fetched at request time (or explicitly invalidated across both apps); no build-time
price snapshots, dictionary prices or fallback price constants are permitted.
Platform-only plan writes continue to use existing RLS. The application editor and
cross-surface propagation tests are not implemented at this checkpoint.

One-time database launch defaults:

| Plan     | Monthly ILS | Yearly ILS | Starting price |
| -------- | ----------: | ---------: | -------------- |
| Starter  |         149 |       1490 | No             |
| Pro      |         249 |       2490 | No             |
| Business |         449 |       4490 | Yes            |

The seed no longer overwrites the catalog or re-enables legacy grants. Changing a
price after initialization must not require deployment. Annual pricing is never
calculated from monthly pricing; no perpetual free-months promotion is assumed.

## Preservation and deployment boundary

Migration `20260921000016_v1_commercial_plans.sql`:

- Renames Enterprise in place, retaining plan UUIDs and business relationships.
- Stops transactionally if both Enterprise and Business already exist, rather than
  choosing a plan or deleting customer data silently.
- Updates application plan codes and rejects inactive/stale plan selections in RPCs.
- Disables non-v1 canonical plan grants without dropping their rows or operational data.
- Adds nullable E.164 `whatsapp_number` to business settings and locations under
  existing tenant policies; branch precedence and entitlement checks still need code.
- Leaves legacy overrides untouched for historical preservation. They must be ignored
  by the forthcoming v1 runtime gate, not treated as commercial access.

Apply locally first, as requested, then continue application implementation and validation:

```bash
supabase migration up --local
supabase test db --local supabase/tests/commercial-plans.test.sql
```

Do not apply this checkpoint to production independently of the matching application
release: the currently deployed application still uses the old plan codes. No remote
migration, seed, schema command or push was performed during this preparation.

## Dormant technical foundations

Stored order lifecycle, checkout, payments/refunds, table-order operations, KDS,
stations, staffing, printer events, operational analytics and custom domains are
future technical foundations. Their schemas/history must remain intact. They are
not v1 benefits. Hiding and server-side disabling of those surfaces is pending.

The WhatsApp cart will reuse published menu pricing/configuration validation only,
keep customer-session state, validate the configured destination and encode a localized
message. Reservation requests will validate name, phone, guests, date, time and notes
and open WhatsApp without claiming availability or confirmation. Both implementations
and mobile/RTL QA are pending after the database checkpoint.
