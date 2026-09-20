# Platform administration

Platform administration is separate from restaurant membership. The existing
`platform_admins` table and `is_platform_admin()` function provide authorization;
the existing tenant RLS helpers already include platform privileges. No new migration
is required.

The authenticated tenant resolver uses the canonical RPC. Platform administrators
without an active membership redirect to `/{locale}/platform` instead of onboarding.
Those with memberships retain their restaurant console and can switch to the platform
console. Normal accounts retain the existing onboarding and tenant navigation.

Every platform page and mutation checks the authenticated user and the RPC on the
server. Checks are request-scoped, not persistent authorization caches. Unauthorized
accounts receive a not-found boundary; anonymous accounts redirect to sign-in.
The console uses the authenticated database client and existing RLS, not a service key.

## Console scope

- Overview: business status counts, profile/membership/plan counts and recent businesses.
  Profile counts are not a claim about total Auth accounts.
- Business search and paginated detail: identity, plan, branches, memberships,
  feature overrides, publication and domains. Domain verification secrets are excluded.
- Plans and existing entitlements.
- Confirmed activate/suspend and feature-override updates, with bounded input validation
  and localized feedback. No impersonation or destructive account management.

The foundation does not include an Auth Users directory or a durable platform-action
audit ledger. Those require separate scoped design if needed.

## Registration audit

The repository currently provides password sign-in, sign-out and authenticated
no-business onboarding. It does not provide account signup, email-verification callback/
resend flows, or password-reset screens/actions. Supabase account provisioning and its
email-confirmation settings remain operator-managed; production dashboard settings
were not inspected. Public self-registration is therefore a product gap, not a
completed capability.

## Validation and operator account check

Local database assertions run transactionally with rollback:

```sh
supabase test db supabase/tests/platform.test.sql
pnpm test:e2e e2e/platform.spec.ts
```

The browser test uses random local accounts, checks platform membership independence,
dual-role navigation, ordinary onboarding, owner/staff denial, role revocation,
and EN/AR/HE mobile/tablet/desktop layouts. Auth traces and screenshots are disabled;
explicit screenshots are taken only after login and stored under ignored `.tmp/`.

To check an existing account against an admin app containing this change, export
`PLATFORM_QA_EMAIL` and `PLATFORM_QA_PASSWORD` in the terminal running the command,
then run:

```sh
PLATFORM_QA_ADMIN_URL=https://YOUR-ADMIN-HOST node scripts/platform-qa.mjs
unset PLATFORM_QA_PASSWORD
```

The helper only signs in and reads protected pages. It never changes businesses or
privileges and does not log credentials. Shell exports in another terminal are not
inherited by an already-running process. The founder account has not been verified
by this task because those environment variables were unavailable to its process.
