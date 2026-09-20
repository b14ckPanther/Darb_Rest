# Controlled customer acquisition

The marketing website routes prospects to `/{locale}/get-started`, not sign-in.
Pricing links carry `?plan=starter|pro|enterprise`; unknown values default to
“Not sure yet”. Sign-in remains a separate link to the admin authentication route.
No free signup, trial, automatic account creation or email delivery is promised.

## Submission and privacy

Applications and general inquiries use distinct forms backed by
`restaurant_applications.kind`. Applications collect contact details, city,
restaurant/café type, branch count and plan preference. Contact collects a real
message and does not duplicate the onboarding wizard.

The web server action validates a strict shared Zod schema, normalizes email and
whitespace, enforces length/type bounds, and uses the existing production request
budget before calling a service-role-only submission RPC. Production requires the
existing Supabase service key, `PUBLIC_RATE_LIMIT_SECRET` and a trustworthy
`TRUSTED_CLIENT_IP_HEADER`. Missing infrastructure fails closed, with a retryable
error instead of a simulated success. Service credentials never enter client code.
Next server actions retain their same-origin submission protection.

Anonymous and ordinary authenticated users cannot read applications or call the
submission RPC directly. There are no public application identifiers, lookups or
status endpoints. A unique partial index deduplicates pending submissions by kind,
normalized email and business name. Repeats receive the same acknowledgment without
overwriting submitted information or revealing whether a record already existed.
Reviewed requests may be submitted again. Text renders as escaped text, never HTML.

## Platform review

`/{locale}/platform/applications` uses the existing fresh platform guard and RLS.
The queue has search, kind/status filters, pending-first ordering and 20-row pages.
Details show the submission and allow a platform admin to approve/reject, record an
internal note and confirm/change the plan. An atomic pending-only RPC records
`auth.uid()` and review timestamps. Concurrent or repeated decisions fail rather
than overwrite the first decision. Direct authenticated updates are not granted.
Inquiries use the same review queue; approval means reviewed, not account access.
The platform navigation also exposes the existing profiles through a paginated,
read-only Users screen; it does not expose auth credentials or grant roles.

## Approval and onboarding boundary

Approval is a recorded access decision, not an invitation. There is no application
email or invitation service in this implementation. Staff must verify the approved
contact and arrange access through the existing trusted account-provisioning
process, then direct the authenticated customer to the existing seven-step business
onboarding. Approval does not create users, businesses, memberships or entitlements.
Existing authentication, onboarding RPCs and tenant permissions remain unchanged.
Before launch, define who follows up on the queue and the account-invitation
procedure. Do not advertise instant access. Retention and deletion of inquiry/contact
information should follow the operator's privacy policy; no automatic retention job
is introduced here.

## Manual migration and verification

Migration: `supabase/migrations/20260921000015_restaurant_applications.sql`.
No migrations were executed during implementation. Apply locally and run the
transactional database suite before deploying this increment:

```bash
supabase migration up --local
supabase test db supabase/tests/applications.test.sql
pnpm test:e2e
```

After confirming the linked project and reviewing the pending migration list:

```bash
supabase migration list
supabase db push --dry-run
supabase db push
```

Do not include seeds. The new browser persistence test explicitly skips when
migration 15 is absent; that skip is not evidence of successful database validation.
Browser tests create and clean up local-only QA records once the migration exists.
Public responsive/CTA tests run without migration 15. The form shows a genuine error
if the database cannot persist a submission.
