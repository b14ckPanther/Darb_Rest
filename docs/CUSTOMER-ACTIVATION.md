# Customer activation and manual billing

## Current release

Migrations 18 and 19 are operator-applied locally. The approval, manual payment, invitation,
private account and locked onboarding interfaces now use this contract. No additional
migration is required by the application implementation. Production delivery still requires
Supabase custom SMTP and a configured transactional adapter; unconfigured mail stays queued.

## Account email-change prerequisite (migration 19)

The Account Settings continuation exposed a migration-18 conflict: after a verified
customer changes their Auth email, every activation update still compares it with the
immutable application email. A local rollback regression reproduced
`customer_identity_mismatch`; the existing 16 assertions passed and this new case failed.
This would also roll back the subscription/business link during onboarding.

Migration 19 preserves the original-email check for initial association and activation.
After activation, the immutable Auth user UUID is the identity boundary. A verified new
login email may differ from the historical agreement recipient; the agreement snapshot is
never rewritten. Account reassignment and activation reset remain prohibited, payment is
still required, and the Auth account must still have a verified email.

Migration 19 has been applied by the operator. Both regression suites are run locally without
executing migrations. Identity remains bound to the verified Auth UUID after activation.

## Separate lifecycle records

- Application: existing pending/approved/rejected review record.
- `customer_agreements`: immutable localized plan/name, recipient and price snapshot,
  monthly/yearly cycle, approval actor/time and unique sequence-backed DR reference.
  Starting-price agreements require explicit amount confirmation. No global price updates
  can change an agreement. Old approved applications are not automatically marked paid.
- `platform_billing_settings`: singleton bit/bank configuration; methods disabled by default
  until an operator reviews/enables them. The requested bit number is a database default only.
  Bank details, sender/support address, localized instructions and due days live here, not code.
- `manual_customer_payments`: expected/paid amounts, pending/confirmed/void state, bit or
  bank_transfer, immutable agreement reference, external/accounting references and private note.
  One confirmed initial payment per agreement; renewal periods have their own uniqueness.
- `customer_activations`: paid agreement → invite attempts/state → verified account → onboarding.
  Association requires the exact normalized application email; activation additionally requires
  confirmed Auth email and a confirmed initial payment. One unfinished activated agreement per user.
- `customer_subscriptions`: agreed plan/cycle/amount copied on atomic business creation;
  period starts on onboarding and ends one calendar month/year later. Future renewal payments
  can reference period boundaries. No recurring debit or automatic collection exists.
- `customer_mail_outbox`: received/approval/rejection/invitation delivery attempts, stable
  deduplication key and queued/sending/sent/failed/unknown states. No passwords or email-body
  copies/internal notes. A timeout is unknown, never an invented success. Provider acceptance
  is not proof of inbox delivery; reconcile before retrying ambiguous external side effects.
- `customer_commercial_audit`: append-only safe action/record/actor/time history.

The approval RPC locks the application, snapshots current independent monthly/yearly DB prices
(or the explicit negotiated amount), creates the pending ledger/activation and queues approval
mail atomically. A separate platform-only RPC explicitly confirms a positive received amount.
Duplicate confirmations fail instead of duplicating records. Partial amounts remain visible;
confirmation requires the full agreed amount (renegotiate before approving). Zero-amount
agreements are rejected for this paying-customer flow.

No anonymous/customer reads on private commercial tables. Authenticated platform admins can
read; writes run through checked RPCs or a trusted server after fresh platform authorization.
Bank instructions require a future purpose-limited, high-entropy, expiring, revocable customer
link. Only its SHA-256 hash is stored; the public DR reference never authorizes a read.

## Onboarding boundary

The original atomic onboarding implementation is retained. A business insert trigger requires
an activated, paid agreement for non-platform users, validates the approved plan and creates
its subscription/link in the same transaction. Direct authenticated business INSERT is revoked;
customers use the existing atomic RPC. Tenant plan changes are rejected; platform management
remains available. Service-role maintenance and platform-created businesses remain supported.
Unaffiliated real-auth users cannot create a business until their paid account activation is complete.
Existing businesses, memberships, menu data and operational history remain intact.

## External setup — before production sending

- Supabase Authentication → URL Configuration: Site URL = the production admin origin
  (`NEXT_PUBLIC_ADMIN_URL`), not the public marketing site. Allow the exact three
  `/en/auth/accept-invite`, `/ar/auth/accept-invite`, `/he/auth/accept-invite` URLs on that
  origin. Add localhost equivalents only to the development project; avoid production wildcards.
- Authentication → Email → SMTP Settings: configure the chosen provider's host, port, username,
  password and verified sender address/display name. Configure SPF/DKIM and DMARC with that
  provider. Credentials belong in Supabase/server configuration, never the billing settings row.
- Authentication → Email Templates → Invite User: use the verified secure confirmation link
  (`{{ .ConfirmationURL }}`) with the server-provided allowlisted redirect, or the final hashed-token
  callback template once the accept-invite implementation is verified. Do not deploy a guessed
  token template before that route exists. Confirm locale handling and test all three paths.
- Select a transactional provider and verify the same sender domain for approval/instruction mail.
  The server adapter selects no vendor automatically. Test only controlled development inboxes.

Official references: [SMTP](https://supabase.com/docs/guides/auth/auth-smtp),
[email templates](https://supabase.com/docs/guides/auth/auth-email-templates),
[invite API](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail),
[redirect allowlist](https://supabase.com/docs/guides/auth/redirect-urls).

Local verification (migrations have already been applied by the operator):

```bash
supabase test db --local supabase/tests/customer-activation.test.sql supabase/tests/customer-activation-identity.test.sql
```

No bank/bit account access, card processor, custody or automatic payment recognition exists.
Receipt/invoice references are bookkeeping links only; lawful document issuance remains the
operator's external accounting responsibility. Renewal collection remains manual. Customer messaging requires the configured adapter described below.

## Application release: migrations 18 and 19

The application now provides commercial approval, billing configuration, manual payment
confirmation, invitation and account setup. The database contract is unchanged.

Platform → Applications → application detail separates the immutable agreement from the
payment and account stages. Approval defaults to the live selected monthly/yearly catalog
price and requires explicit agreement confirmation. An operator may negotiate that amount.
Only `approve_customer_application` creates commercial agreements; the old review action
cannot approve. Payment confirmation uses `confirm_customer_payment` and requires an
explicit receipt checkbox. Approval/payment never silently creates a business.

Platform → Billing settings controls enabled bit/bank methods, instructions in three languages,
verified sender display name, support address and payment due days. Approval email bodies
contain only approved customer fields and enabled payment details. Internal notes never enter
mail templates. Existing general inquiries remain separate from commercial approval.

### Transactional provider adapter

Configure server-only variables on both web (received notification) and admin (commercial mail):

```dotenv
TRANSACTIONAL_EMAIL_ENDPOINT=https://your-mail-adapter.example/send
TRANSACTIONAL_EMAIL_TOKEN=server-only-adapter-token
TRANSACTIONAL_EMAIL_FROM=verified-sender@your-domain.example
```

A built-in Resend adapter is available without another service or SDK. Set
`TRANSACTIONAL_EMAIL_PROVIDER=resend`, `RESEND_API_KEY` and
`TRANSACTIONAL_EMAIL_FROM` (a verified bare sender address). The platform sender display name
and support reply-to are applied at send time. No Resend account is created or configured by
this release. Its [send API](https://resend.com/docs/api-reference/emails/send-email) accepts
an idempotency key; [keys expire after 24 hours](https://resend.com/docs/dashboard/emails/idempotency-keys),
so uncertain delivery is deliberately never retried automatically.

Alternatively, set `TRANSACTIONAL_EMAIL_PROVIDER=http` and configure the three HTTP variables
above for another vendor. Its contract is:

- HTTPS POST, bearer authentication and `Idempotency-Key` equal to the stable outbox UUID.
- JSON: `from`, `senderName`, `to`, optional `replyTo`, `subject`, `text`, `html`.
- The adapter must enforce idempotency durably and return 2xx JSON `{ "id": "provider-message-id" }`
  only after the vendor accepted the message. Preserve that result for repeated identical keys.
- 4xx validation/auth rejection is failed; timeout, rate limiting, conflict, invalid acknowledgment
  or 5xx is uncertain. Reconcile uncertain deliveries with the provider before any retry.

Without the selected provider’s required variables the outbox remains queued and the operator sees configuration
feedback. There is no fake successful delivery. Public application persistence is independent
of mail availability. Failed/queued notifications can be retried from application detail.
There is no unattended queue worker in this increment; delivery is attempted on application/
approval/rejection and explicit operator retry. A crashed sending claim requires operator
reconciliation. Provider acceptance does not prove inbox delivery.

### Auth SMTP and redirects

Auth invitations use server-only `inviteUserByEmail`, separately from the transactional adapter.
Configure Supabase custom SMTP, verified sender domain, SPF/DKIM/DMARC and adequate Auth
mail limits before real customers. Never use the development mail catcher in production.
Set the Site URL to the exact `NEXT_PUBLIC_ADMIN_URL` origin. Allow each localized
`/en/auth/accept-invite`, `/ar/auth/accept-invite`, `/he/auth/accept-invite` and `/en/account`,
`/ar/account`, `/he/account` redirect. Keep production and local project allowlists separate.

The default `{{ .ConfirmationURL }}` invite is supported; fragment credentials are consumed
into the Supabase cookie session and immediately removed from browser history. For SSR
email templates, the provided `/auth/confirm` endpoint accepts a hashed token and an allowlisted
email type, and redirects only to a configured admin-origin route. Suggested invite link:

```html
<a
  href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&locale={{ .Data.preferred_locale }}"
  >Accept invitation</a
>
```

Localize the template wording in Supabase. For email-change and recovery templates use the
same endpoint with `type=email_change` or `type=recovery`; set `locale=en`, `ar` or `he`.
Missing/invalid locale falls back to English. Keep secure email change enabled (confirmation
at both addresses), and enable password/email-change security notifications. No external
Auth configuration is changed by this release.

New users choose and confirm a password (12–128 characters); no password is generated or
emailed. Confirmed existing users keep their existing credentials, receive a sign-in instruction
through the transactional outbox, and explicitly activate after authentication. Unconfirmed
existing users follow Auth invitation behavior; explicit Auth errors remain visible and must
be resolved without overriding passwords. Invitations are claimed before external sending;
concurrent sends fail, retries have a 60-second cooldown, and uncertain states are not retried
automatically. Supabase SMTP acceptance is tracked separately from account activation. If a new invitee
has already verified the email but has not completed setup, an explicit resend uses Supabase
recovery to return to password setup; it never downgrades that invitee into the existing-account
shortcut. Keep the recovery template’s confirmation URL and allowlisted redirect enabled.

### Private account and onboarding

`/[locale]/account` edits the signed-in user's profile name, personal phone and preferred
locale. It never updates business/branch contact tables. Login email and password use
Supabase Auth's own update/verification flow. Pending new email is shown; the historical
agreement email stays immutable. Platform screens never expose passwords.

Paid activation is resolved by verified Auth UUID, including after a login email change.
Onboarding shows the locked agreed plan, cycle, price and reference, with no catalog switcher.
The existing atomic onboarding RPC creates the owner/business/branch and migration-18 triggers
link the agreement and subscription in that transaction. Deactivating a catalog plan does not
rewrite an approved agreement. Periods use the agreed month/year cycle starting at onboarding.
Manual renewal records are supported by the schema; recording renewals/extending periods is
not a new automated billing workflow in this release. Accounting documents remain external.
