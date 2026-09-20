# Restaurant content core

## Ownership and structure

Business → menus ↔ branch assignments → ordered sections → dishes.
Menus are shared business content; branches never duplicate dishes. Composite foreign keys
include business IDs on every relationship, including overrides and modifier links.
Sections can be hidden; menus and dishes are archived. Small replaceable child records
(variants, options, assignments, tags) may be deliberately deleted.

Names and descriptions use AR/HE/EN JSON objects. One nonblank name is required; translations
are optional. Fallback text carries its original language and direction. Mixed scripts retain
Ubuntu, Cairo and Heebo independently of the interface language.

## Prices and customization

Prices are PostgreSQL numeric(12,2), validated as nonnegative amounts with at most two decimals.
Currency comes from the business when a dish is created; it is stored on the dish.
Variants have **absolute prices**, replacing the base price. Preview shows the minimum
available variant price; a dish without available variants displays its base price.
Reusable business-owned modifier groups attach through item_modifier_groups. Options carry
extra prices. Required means min_select > 0. Deferred database checks ensure min/max fit
the option count and the minimum can be satisfied by available options.

Dietary tags and allergens use normalized item links with checked codes. Add new codes through
a migration, shared constants and all dictionaries. Halal/kosher are restaurant declarations,
not certifications; preview includes the restaurant-provided information disclaimer.

## Branch behavior

A menu is offered at branches through enabled menu_locations records. Overrides reference
a same-business branch and item, with independent nullable visibility, availability and price.
The shared resolveItem helper applies override → base. Null means inherit; false and zero are
real values. Variant prices are unchanged by a base-price override. Hidden items are omitted;
unavailable items remain visible with a clear label. Scheduling is deferred.

## Mutations and permissions

Content actions require real Supabase Auth and the selected business membership. No mock
session can save content. Owner/admin/manager/editor can edit. Staff can only toggle availability
through a narrowly scoped RPC. Read-only users can view and preview.

save_menu_content is a bounded, allowlisted, SECURITY INVOKER batch for atomic parent/child
updates, subject to RLS. A per-business transaction lock coordinates batches. Composite keys
prevent tenant-crossing relationships. Important content cannot be deleted directly by
authenticated clients. The initial-owner membership policy is restricted: onboarding creates
ownership inside its existing authenticated SECURITY DEFINER transaction, rather than allowing
self-enrollment into an arbitrary existing business.

content_audit_events records creations, publication/archive changes and branch assignments.
Only owners/admins read audit rows. Character edits and reordering are not audited.

## Media

menu-media is a private bucket. Object paths are:
businesses/<business-id>/menu-items/<item-id>/<random-id>.webp.

The authenticated server endpoint checks origin, edit permission, item ownership, MIME,
actual decoded format, 5 MB input, dimensions 64–10,000 and maximum 40 megapixels.
Sharp rotates, resizes to fit 1400×1400, strips metadata and writes WebP.
No service-role key is used by the endpoint. Storage RLS independently checks membership and
item ownership. Replacements use updated_at compare-and-swap; failed updates clean up the new
object, successful replacements/removals clean up the old one. Cleanup failures are logged
for operational retry. Archiving retains images with the content; no destructive purge exists.
Image changes save immediately, independently of other unsaved dish fields.

Preview uses a batch of one-hour signed URLs, lazy image loading and a neutral no-image
treatment. This is an authenticated guest-style preview, including marked drafts, **not an
anonymous published menu API by itself**. Refresh renews expired image URLs.

## Reads, responsiveness and testing

Content context/data are request-memoized, never globally cached across users. Reads use one
query per content table in parallel, with stable pagination in 1000-row pages and a 5000-row
per-table safety ceiling. The business collection supports switching menus and branches
without per-item queries; very large catalogs will need menu-scoped pagination before exceeding
that ceiling. Signing is batched. Database indexes cover business sorting and parent links.

The editor uses keyboard/touch move controls, native modal dialogs, localized validation
errors, semantic language fields and nonoptimistic saves. Preview is shared in @darb-rest/ui;
brand colors decorate borders while text/control contrast uses controlled neutral colors.

Run local integration checks:

    supabase start
    supabase db reset --local
    supabase test db
    pnpm test:e2e

The content Playwright project runs an isolated server on port 3101 with .next-phase4 output.
Its fixture script verifies localhost Supabase, creates real local Auth editor/read-only/staff
accounts and memberships, and never uses the linked remote. Seed SQL itself contains no auth
credentials. Existing app servers on ports 3000/3001 remain separate.

Phase 5 adds a separate public ordering projection and shared cart/configuration controls. See
[ORDER-ARCHITECTURE.md](./ORDER-ARCHITECTURE.md). Phase 6 adds [payment foundations](./PAYMENT-ARCHITECTURE.md). QR codes, kitchen workflow and
analytics remain future work.

## Phase 10 presentation layer

restaurantMenuModel now supplies both the owner MenuPreview and all public RestaurantMenu
templates. Catalog variants never duplicate content, availability, branch override or pricing
logic. Publication still uses the existing public menu projection. See
[TEMPLATE-ARCHITECTURE.md](./TEMPLATE-ARCHITECTURE.md).
