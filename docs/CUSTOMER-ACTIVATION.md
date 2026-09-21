# Customer activation and manual billing

## Checkpoint: migration prepared, application implementation pending

Migration 18 is a prerequisite, not a completed activation release. Do not onboard real
customers through this checkpoint. No migration or email has been executed. Existing
order-payment tables are dormant and are not reused for customer subscription billing.

Current gaps: application review records a decision only; there is no email adapter,
Auth invitation/callback, password setup, agreed-price snapshot, manual ledger or customer
subscription UI. Current onboarding accepts a plan from the client. The database contract
below closes that creation boundary; its matching application still needs implementation.

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
This intentionally makes unaffiliated real-auth onboarding fail until the invite UI is shipped.
Existing businesses, memberships, menu data and operational history remain intact.

## Next implementation after manual application

1. Generate database types from the local schema using the repository convention.
2. Build the commercial approval/settings/payment/customer timeline interfaces and server actions.
3. Add localized safe email templates and a provider-neutral transactional adapter. Until an
   actual provider is configured, record an actionable failure; never claim delivery.
4. Claim invitation attempts transactionally. For a new user call server-only
   `supabase.auth.admin.inviteUserByEmail(email, {data: {full_name}, redirectTo})`.
   Do not generate passwords. On network ambiguity reconcile the Auth user before retrying.
5. Existing confirmed users sign in normally and prove the matching verified email before
   association. Do not overwrite passwords, create duplicates, or trust mutable user_metadata
   for commercial privileges. Existing unconfirmed/invited users need a supported resend flow,
   not a password reset that silently grants commercial access.
6. Implement `/[locale]/auth/accept-invite`: verify invite token via Supabase, establish secure
   session, collect/confirm a customer-chosen password, update Auth, then record activation.
   Reject expired/invalid links; validate redirect destinations against configured admin origin.
7. Render a locked agreement summary in onboarding, send its plan to the existing RPC, and
   show subscription/customer status afterward. Preserve the agreed price, not current catalog.
8. Add failure, concurrency, existing/new user, tenant isolation and AR/HE/EN mobile E2E tests.

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
  This checkpoint selects no vendor and sends no mail. Test only controlled development inboxes.

Official references: [SMTP](https://supabase.com/docs/guides/auth/auth-smtp),
[email templates](https://supabase.com/docs/guides/auth/auth-email-templates),
[invite API](https://supabase.com/docs/reference/javascript/auth-admin-inviteuserbyemail),
[redirect allowlist](https://supabase.com/docs/guides/auth/redirect-urls).

Manual local application (review pending migrations first):

```bash
supabase migration list --local
supabase migration up --local
supabase test db --local supabase/tests/customer-activation.test.sql
```

No bank/bit account access, card processor, custody or automatic payment recognition exists.
Receipt/invoice references are bookkeeping links only; lawful document issuance remains the
operator's external accounting responsibility. Renewal collection and customer messaging are
not implemented at this prerequisite checkpoint.
