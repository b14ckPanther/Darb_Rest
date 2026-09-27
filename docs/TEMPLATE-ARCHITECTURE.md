# Restaurant templates and theming

> Current catalog: nine templates. The Phase 10 sections below describe how the engine was
> built; the [Caramel and semantic theming](#caramel-and-semantic-theming) section at the end
> covers the latest additions.

## One engine, a growing catalog

Templates contain presentation only. The pure TEMPLATE_CATALOG in packages/types defines stable
IDs, schema versions, localized names/descriptions, style tags, recommended business types,
preview assets, premium readiness and supported density/media controls. There is no database enum
or maximum template count. The UI registry binds definitions to hero components and scoped styles.

The eight initial designs are Signature, Editorial, Essential, Coffee House, Quick Counter,
Bold Table, After Dark and Bake & Gather; Caramel was added later as the ninth. They have different hero compositions, navigation,
item grids/rows, image proportions, typography scales, spacing and mobile layouts—not just colors.
Their shared font system remains Ubuntu/Cairo/Heebo.

Adding a template requires a metadata definition, a presentation component/registry binding,
scoped CSS and optional catalog preview asset. It does not require a new restaurant/menu schema,
pricing function, cart implementation or checkout integration. Registry tests require a renderer
for every definition. Unknown IDs/versions fall back to the safe default on public reads; the
admin save action rejects unsupported definitions/options. All current templates are free.
The premium flag is metadata only, not a billing implementation.

## Shared data and ordering contracts

restaurantMenuModel resolves assigned menus, visible sections, branch overrides, item availability,
variant starting prices, modifiers, dietary tags and allergens. Both the old owner MenuPreview and
new RestaurantMenu use this model. The public database projection still determines which records
may leave the server. Template styling never changes these rules.

OrderingMenu owns configuration, quantity, cart, draft recovery, authoritative submission and
checkout for every design. RestaurantMenu receives presentation props and an onConfigure callback.
The same server actions, PostgreSQL pricing validation, payment adapters and table capability
checks are reused. Templates cannot supply totals or change ownership. Switching presentation
preserves cart state. Branch links explicitly confirm a change and drop table context; carts remain
scoped to business/branch/table.

## Public routes and information

The web proxy rewrites /<business-slug> internally to the cookie/default locale without changing
the visible URL, preserving query parameters. /<locale>/<business-slug>?branch=<branch-slug> is
also supported. An omitted branch resolves deterministically to the first active primary branch,
then creation time/ID. An invalid explicit branch never falls back to another branch.

Legacy /<locale>/order/<business>/<branch> and QR entry URLs render the same template experience,
so previously printed QR codes keep working. Language links preserve branch, order recovery and
table token. The QR gateway still validates token ownership/activity on every draft/checkout.

Public reads explicitly project active business/branch contact information, social links and hours.
Only published appearance JSON is queried; draft settings never enter public props. Only the
existing public menu RPC's visible item images receive signed URLs. Metadata uses the restaurant
name and canonical business/branch URL. Referrer policy protects table capability URLs.

Hours are calculated in the branch timezone (business timezone fallback), refreshed each minute,
with unknown-hours handling. The canonical schema allows same-day intervals; overnight intervals
are not invented. Hours are informational and do not introduce a new checkout cutoff rule.

## Draft, preview and publish

Owner/admin access is required for Appearance → Templates and the private preview route.
The editor visually browses/filter styles, customizes supported options, saves drafts and publishes.
Preview uses the owner's real assigned active content in a separate same-origin document with its
own 390/834/1280px viewport. It scales to fit the editor without changing its layout viewport.
CSS container queries govern template structure; device preview is not a narrow div pretending
to be a desktop browser.

Live messages require both matching origin and parent-window identity and validate the settings
again. No draft token or secret is placed in a public URL. Preview cart/configuration use the
real shared client engine, but previewOnly guards persistence and disables draft/submit actions.
Preview changes are never submitted as real orders.

Migration 10 adds restaurant_appearance with draft/published JSON, revision, published_at and
updated_at. Owner/admin RLS permits reads; direct client writes are revoked. The authenticated
save_restaurant_appearance RPC checks active business membership, allowed keys/types/URLs/colors,
takes a per-business lock and requires the current revision. Publish atomically copies the submitted
settings into both draft and published; later draft edits cannot change the public snapshot.
The server additionally validates catalog support and expected business ID, preventing stale
editors from saving into a newly selected tenant. Concurrent editors receive a conflict instead
of overwriting changes.

Migrations 10 and 11 were applied by the operator and their follow-up validation passed.
Migration 12 is authored only; no migrations or remote commands were executed in Phase 10.x.
Missing appearance storage uses safe legacy branding/defaults for public reads while save/publish
fails explicitly; other database errors are not silently swallowed.

## Controlled theming and media

Hex colors, managed/legacy image references, supported density, menu-image visibility and the
bounded composition choices described below are configurable. No CSS, markup, scripts, arbitrary fonts or freeform layout values are accepted.
The renderer independently sanitizes URLs and colors. Buttons pair each primary color with black
or white using measured relative luminance (at least 4.5:1). Body copy remains on controlled
surfaces. Only the logo overlaps cover imagery; heading text stays on an opaque surface.

Logos/covers use the private managed-upload pipeline introduced by self-service polish; legacy
HTTPS references remain supported. Menu photography continues through the existing private,
optimized media system. See [BRANDING-MEDIA.md](BRANDING-MEDIA.md). Cover video
is optional, controlled, preload=none and never autoplays. This is video readiness, not video
hosting/transcoding. Businesses without imagery get neutral placeholders, not invented dish photos.
Catalog preview SVGs illustrate each layout and contain no customer data.

## Validation and limitations

Unit tests cover registry completeness/extensibility, settings and URL rejection, color contrast,
timezone hours and shared menu/branch projection. Browser coverage exercises all eight templates
with real authenticated restaurant data, shared item configuration/cart review, device previews,
AR/HE/EN and responsive layouts. Existing real guest checkout/payment/QR/KDS tests remain in place.

After the operator applied migration 10, all 219 local database assertions (14 appearance-specific)
and all 48 E2E tests pass. Published templates are exercised in EN/AR/HE on both seeded branches,
including configuration/cart review and one persisted draft-to-submitted order per template.
Draft/publication isolation, persistence, stale revisions and tenant/role enforcement pass.
Typecheck, lint, 90 unit tests, both builds and formatting also pass. No migration or remote
schema command was run during this validation.

Production DNS/deployment, physical device testing, video hosting, real payment gateway activation,
premium billing and production load testing are outside this phase. No analytics, reservations,
loyalty, delivery or coupons were implemented.

## Phase 10.x — Template Excellence & Self-Service UX

The [pre-implementation audit](PHASE-10X-AUDIT.md) classifies strengths, differentiation gaps,
owner control gaps, media issues and native-script refinements. Keep the eight template identities
and all restaurant/order logic. No analytics or unrelated backend work is part of this increment.

### Bounded composition, legacy-safe snapshots

`AppearanceSettings.layout` is optional. Legacy nine-key snapshots resolve to `DEFAULT_LAYOUT`;
existing branding/draft/guest flows do not need a rewrite. New snapshots store eight enum choices:
hero emphasis, focal preset, category navigation, card edges, information placement, CTA treatment,
footer detail and surface mood. `LAYOUT_OPTIONS` defines the finite vocabulary; catalog
`layoutControls` declares which controls a template exposes. Essential hides cover controls;
values remain stored across template switches for restoration on a supporting template.

`resolvedLayout` independently rejects unknown presentation values on public rendering. Zod
rejects unknown fields/values/partial objects at the editor boundary. Migration
`20260920000012_template_composition.sql` extends only appearance RPC validation to accept the
optional strictly validated object, preserving tenant checks, revision locks, atomic publication,
legacy snapshots and the migration-11 media trigger. It is authored only, not applied.

Menu/category/item order stays canonical in the existing content editor. Appearance links there;
it does not introduce parallel ordering arrays or mutate menu, branch, table or operational data.
Information placement changes actual DOM order. Footer can reuse existing business contact data;
it cannot remove the required allergen disclaimer. CTA outline uses controlled text ink, not an
unreadable arbitrary brand color. Four palette presets remain editable with the existing safe
hex-color and contrast rules. No custom CSS/code/fonts or arbitrary numeric dimensions exist.

### Template rhythm and workflow

Signature uses centered course divisions and a restrained single-column desktop menu; After Dark
uses an intimate numbered menu with desktop side navigation and narrow photography. Quick Counter
has denser scan-friendly rows and desktop price/action alignment. Bakery keeps a responsive
product catalog with consistent actions. Editorial, café, minimal and graphic structures stay
independent. CSS uses container breakpoints and logical properties; Arabic/Hebrew display text
uses native line-height without Latin letter tracking. No font changes were made.

Appearance offers direct edit/preview jumps, desktop sticky publication controls, grouped
composition options and palette presets. Existing dirty/draft/live and revision-conflict handling
remain. Template changes retain branding and composition choices. Private previews reuse real
restaurant content and the same cart; they cannot create orders.

### Managed media refinement

Managed covers use `srcset` with bounded 480/960/1440 widths. Both authenticated preview and public
published-only delivery validate the same object access before deriving WebP without upscaling.
Original uploads remain immutable. External HTTPS legacy images are not fetched/proxied by these
routes and cannot obtain responsive derivatives. Logos retain explicit geometry; covers maintain
crop containers with center/upper/lower focal presets. Image errors reveal the controlled
placeholder instead of broken-image chrome. Dish images keep existing optimized media and lazy
loading. The video poster now resolves managed references correctly; video remains optional,
user-played and preload=none.

Public delivery deliberately remains no-store to enforce immediate publication removal. Derived
images currently cost server CPU per request; production load measurement and safe derivative
storage/cache invalidation are still necessary before claiming production-scale media performance.
No new video hosting/transcoding or external-media optimization is claimed.

### Validation after operator-applied migration 12

All 56 E2E tests and 24 local composition SQL assertions pass. Coverage includes exact persisted
palette/composition snapshots, draft/public boundaries, finite options, malicious option rejection,
same-template brand variation, switching with a configured cart and EN/AR/HE responsive layouts.
All eight templates retain real-data public ordering coverage. Media tests verify crop/failure
behavior, derived WebP size and published/draft access. Typecheck, lint, unit tests, build and
formatting pass. No migrations or remote commands were run during this validation.

Physical-device, cross-browser, photographic art-direction and production-load certification
remain outside this evidence. Phase 11 has not started.

## Caramel and semantic theming

### Caramel, the ninth template

Caramel is a warm boutique layout with a category rail, horizontal dish carousels, a detailed
dish modal, venue information and its own footer. It lives in `packages/ui/src/restaurant/caramel`
with scoped `caramel.css`, and was added exactly as the extension model above describes: a catalog
definition in `template-catalog.ts`, a registry binding and localized copy. It reuses the shared
menu model, `OrderingMenu` cart and WhatsApp request flow; no schema, pricing or cart code changed.
Unit tests (`caramel-template.test.ts`) and the E2E template suite cover it alongside the others.

### Semantic theme

`AppearanceSettings.theme` is an optional object of 22 named color roles: brand (primary, accent),
surfaces (page, card, alternate surface, navigation, modal, footer), text (main, muted, modal,
footer), interactive elements (buttons, active category, price badge), status (open, closed) and
details (border, hero overlay). `TEMPLATE_DEFAULT_THEMES` gives every template its own tuned
defaults; `resolveSemanticTheme` merges the template defaults, the brand colors and any owner
overrides, and `semanticThemeToCssVars` exposes the result as scoped CSS variables. Snapshots
without a theme keep rendering exactly as before.

The Appearance editor groups the roles (brand, surfaces, text, interactive, status, advanced),
supports per-group reset back to the template preset and shows a low-contrast warning using the
same `contrastRatio` helper as the renderer. Colors are still validated hex values only; there is
no custom CSS.

### Restaurant utility bar and language switcher

Restaurant pages share a utility bar for language and branch selection. Owners can hide the
language selector with `showLanguageSwitcher`; the bar hides itself entirely when the selector is
off and the restaurant has a single branch. Language links keep the branch and cart context.

### Persistence

Migration `20260923000020_semantic_appearance_theme.sql` extends `save_restaurant_appearance` to
accept the optional, strictly validated `theme` object, and
`20260923182500_appearance_language_switcher.sql` adds the boolean `showLanguageSwitcher` key.
Both are additive: the RPC keeps its tenant checks, revision lock and atomic publication, and
older nine- and ten-key snapshots remain valid. `packages/validation` rejects unknown theme roles
and malformed colors at the editor boundary.
