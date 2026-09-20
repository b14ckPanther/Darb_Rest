# Managed branding media

Appearance is the owner/admin home for customer-facing logo, cover, colors and templates.
Settings retains business, regional and contact information. Existing HTTPS images remain supported.

Migration `20260920000011_branding_media.sql` must be applied manually by the operator before
managed uploads work. It creates a private `restaurant-branding` bucket, tenant role policies and
an appearance-reference trigger. It has not been executed by this increment.

Authenticated uploads use `/api/appearance-media`. The route verifies same origin, active tenant
and owner/admin role, bounds streamed body size, checks MIME and decoded image format, rejects
animated/unsupported images, strips metadata, resizes logo to at most 512×512 and cover to at most
1920×1280, and encodes WebP. Uploads use new UUID paths and cannot overwrite/delete existing objects.
The input limit is 5 MB; supported inputs are JPEG, PNG and WebP.

Appearance stores logical references of the form
`https://media.darb.invalid/branding/<business UUID>/<object UUID>.webp`. This reserved hostname is
never fetched: shared presentation resolves it to the authenticated preview route or public
`/restaurant-media` route. This preserves the existing HTTPS appearance contract without storing
expiring signed URLs. A database trigger rejects foreign/missing managed references even through
direct appearance RPC calls. No arbitrary Storage paths or file types are supported.

Public delivery checks that the active business's **published** logo/cover references the object
before reading private Storage with the server-only client. Draft-only assets return 404 publicly.
Public responses are no-store so unpublishing an asset takes effect without a public cache window.
Replacing/removing a draft does not delete the previous published object. Orphan retention and a
future safe cleanup job are separate work; this increment performs no object deletion.

Validation: `pnpm test:e2e` includes upload, replacement, removal, draft privacy, publication and
unpublication checks at the end of the appearance persistence test, avoiding competing publishers
for the same fixture. Until migration 11 is manually applied, that test must fail at upload; it is
not skipped or treated as passed. Other tests cover unauthorized roles, foreign paths, bad files,
and multilingual cart/draft/confirmation/table continuity.

## Migration 11 validation follow-up — 2026-09-20

The operator reports migration 11 applied locally and remotely. Local managed-branding validation
now passes for logo and cover upload, authenticated preview, replacement, draft-only privacy,
published delivery, draft removal preserving live assets, and publication revoking old public
references. Editor/foreign-tenant/invalid-file rejection checks pass. The E2E helper now waits for
the editor to be interactive and reads the collapsed legacy fields by label; no application or
schema change was needed. This supersedes the earlier migration-related validation block.

All eight templates retain EN/AR/HE responsive and RTL coverage (375/430/834/1440 widths and
preview device modes). Representative rendered screenshots were inspected. Validation remains
local Chromium-based, not a remote deployment or physical-device/cross-browser certification.
Private orphan-object cleanup remains deferred. No migrations or remote database commands ran.
