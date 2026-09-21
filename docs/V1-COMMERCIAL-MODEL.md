# Darb REST v1 commercial model

## Status: application alignment implemented

Migrations 16 and 17 were applied locally by the operator. This continuation uses their
existing contract; it does not apply migrations or introduce another plan model.
Previous phase documents describe technical history, not current commercial scope.

## Locked scope

| Plan     | Scope                                                                                                                                                                                                                                                     |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Starter  | One location; premium digital presence; all eight templates, colors, logo, cover, AR/HE/EN, native directionality, menu QR access, rich dishes, variants/modifiers, availability, hours, contact and social information. No cart or reservation requests. |
| Pro      | Starter plus session cart, structured WhatsApp order requests, customer details/notes, lightweight WhatsApp reservation requests and priority support. One location.                                                                                      |
| Business | Pro plus centrally managed locations, branch menus/settings/hours/contact/availability, branch WhatsApp destinations and guided onboarding. Default included-location limit two; commercial limits remain editable.                                       |

No dish/menu quotas are introduced. Branding and template quality belong to every plan.
Reservation requests are messages, not confirmed bookings. WhatsApp order requests do
not create stored orders, payment records, status tracking or kitchen work.

## Alignment implemented

Public pricing, homepage cards, application selection and onboarding read the same active
commercial catalog. Platform Admin edits monthly/yearly prices independently, starting-price
state, visibility, order, localized descriptions, bullets and billing notes. A separate form
edits the eight v1 entitlements and location limits. Server validation and platform authorization
protect both writes. Requests fetch the catalog without persistent caching, so changes appear
on the next request without deployment; an already open page needs refresh.

Legacy Enterprise UI/validation, premium-only branding, Pro multi-location assumptions,
checkout and operational marketing have been removed from active surfaces. Historical SQL
retains the former plan name to preserve migration history. Dormant feature overrides cannot
re-enable capabilities through the v1 entitlement resolver.

## Database contract

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
Platform-only plan writes continue to use existing RLS. The application editor and cross-surface propagation tests use this projection.

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
  existing tenant policies; branch precedence and entitlement checks are enforced server-side.
- Leaves legacy overrides untouched for historical preservation. They must be ignored
  by the v1 runtime gate, not treated as commercial access.

## Runtime and validation

No further migration is required by the application continuation. Local contract verification:

```bash
supabase test db --local supabase/tests/commercial-plans.test.sql supabase/tests/applications.test.sql
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:e2e
pnpm format:check
```

## WhatsApp requests

The session cart reuses published menu configuration and pricing validation. A server action
rechecks publication, plan access, configured destination, variants, modifiers, availability
and current totals before generating an encoded WhatsApp URL. Client prices are never accepted.
Cart state is scoped to business/location and survives language switching. Customer details and
notes are not stored as an order. Customers explicitly open WhatsApp and send the message there;
Darb does not claim delivery, acceptance or a confirmed reservation.

Reservation requests validate name, phone, guests, date, time and notes. No availability,
calendar or confirmation engine exists. Business may configure a branch destination, with
fallback only to an explicitly configured business destination. Pro uses the business number.
Missing/invalid destinations disable the corresponding public action.

## Dormant technical foundations

Stored orders, checkout, payments/refunds, table operations, KDS, stations, staffing, printer
events, operational analytics and custom domains remain historical technical foundations.
They are not v1 benefits. Navigation and operational endpoints are disabled; migration 17's
revoked grants remain intact. Menu QR downloads do not create table context or operational data.

Legacy operational E2E files are retained but excluded from the active v1 suite: expecting
revoked RPCs or checkout to succeed would contradict the product boundary. Active tests cover
absence of these routes and the replacement commercial flows. Existing operational data is
not deleted. Invitation/email delivery remains a manual approval follow-up; no delivery is faked.
