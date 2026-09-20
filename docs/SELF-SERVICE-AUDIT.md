# Self-service product review — 2026-09-20

## Product health

**Operational foundation is credible; premium owner self-service needs a focused polish increment
before another major capability phase.** An owner can manage real multilingual dishes, branch
availability, configurations and templates, and receive QR/takeaway orders in KDS. Presentation
choices share the same engine and are structurally different. Branding media and publication
confidence still require too much technical understanding. Two navigation regressions lose customer
context. No tenant data leak was observed; this manual review is not a security certification.

This audit continues completed Phases 1–10. It does not replace their roadmap or declare a new
Phase 11. No migration, remote Supabase command, seeder, payment-provider call or application-code
change was run. The earlier automated test results remain historical evidence, not tests rerun here.

## Method and evidence

Used the existing signed-in `test@darb.co.il` browser session at localhost:3101 and public app at
localhost:3100. No password was read, reset or stored. Primary fixture: `darb-test-restaurant`,
Central/Garden; five secondary role businesses. Browser UI actions, accessibility/DOM inspection,
manual screenshot review and narrowly scoped source checks supported the findings below.

- Configured Large/Oat latte: 19 + 3 = ILS 22. Submitted takeaway as **Audit Guest**, order
  `36c6c242-5bde-4a93-9564-96825f925888`; appeared in Central KDS and was accepted there. Guest
  Refresh status showed Accepted. Garden kitchen remained empty.
- Active QR resolved Test 1/Main. Submitted **Audit Table Guest**, salad ILS 32, order
  `fc34f535-cfe3-453a-bf17-de2f2a194654`; Central KDS showed Dine-in / Test 1. Revoked QR showed
  a localized unavailable-link message and no menu. Tokens are intentionally omitted from this report.
- All eight templates reviewed with actual fixture content in owner preview, EN/AR/HE. Checked
  390px mobile previews, 834px tablet and 1280px desktop preview documents; no horizontal overflow
  found in the measured layouts. Public standalone EN mobile was 390px; public HE desktop was
  1280px. Browser outer viewport overrides were inconsistent, so exact tablet evidence is from
  the real 834px preview iframe, not a claim about a physical tablet.
- Arabic/Hebrew headings, localized dishes, prices, controls and RTL alignment were inspected;
  script-specific text rendered appropriately in representative screenshots. English strings in
  generated fixture photographs/business-role suffixes are fixture content, not missing UI translations.
- Visually inspected Signature, Editorial, Essential, Coffee House, Quick Counter, Bold Table,
  After Dark and Bake & Gather. Distinct hero/card/category treatments are present, not just recolors.
  Large-format imagery is substantially more prominent in Editorial/Bold/Night/Bakery. These can
  slow first-dish discovery compared with Essential/Quick Counter.
- Switched templates, used all three device modes, saved drafts, published Bake & Gather, observed
  its Arabic public page, then saved a different draft and verified public remained Bakery. Restored
  **published Signature / draft Editorial**, original colors and image visibility. Pale primary color
  `#ffffff` produced black text on white buttons in private preview; it was not published.
- Reviewed dish identity/price, variants, modifier assignment, branch adjustments and image-upload
  controls. Temporarily enabled the sold-out soup, saw the public Add button, then restored sold-out
  state and verified public unavailable state. Garden salad override showed ILS 35 vs Central 32;
  Garden hid latte correctly. Hidden special did not appear publicly.
- Menu image uploads were inspected, not executed; no real customer photos were uploaded. All
  observed fixture images loaded. Perceived navigation was usable after dev compilation, but no
  production timing, network throttling, Core Web Vitals or large-menu load benchmark was performed.

### Roles and boundaries

| Role / fixture | Observed result                                                                                     | Scope of confidence                                                          |
| -------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Owner          | Appearance publish/draft, content editing, availability update, KDS accept available and functional | Actual mutations tested on primary fixture                                   |
| Admin          | Appearance publish controls available on separate admin business                                    | UI/access checked; did not publish that empty business                       |
| Manager        | Tables/Add table available; Appearance direct route denied                                          | UI and route guard checked                                                   |
| Editor         | Create menu/modifier controls available; Appearance direct route denied                             | UI and route guard checked                                                   |
| Staff          | Menu view access without create controls; operational navigation visible                            | UI boundary checked, not every operational mutation                          |
| Read-only      | Menu view access without writes; Kitchen and Appearance direct routes denied                        | UI and route guard checked                                                   |
| Cross-tenant   | Owner-business order URL while active in admin secondary business returned No records found         | Direct order-read isolation checked; no exhaustive adversarial RLS/API audit |

### State left behind

Two clearly named fictional audit orders remain for review (takeaway Accepted, table order Submitted).
Original appearance baseline, owner business selection and soup availability were restored. The
availability actions and publishing tests legitimately add history/revision changes. No records were
deleted. Preview-only changes were discarded. Temporary viewport override was reset.

## Findings

Evidence: **UI** = reproduced through the browser; **source** = confirmed by existing code;
**scope** = an observed missing control/capability, not an assertion of a broken implemented feature.

| ID / category                           | Severity | Screen / flow and what is wrong                                                                                                                                                                                                                                                                  | Recommended fix                                                                                                                                                                     | Placement                                                            |
| --------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| B1 — Bugs / regressions                 | high     | **UI + source:** Immediately after submitting an order, language links omit its new `order` query parameter. Switching EN → HE returned to an empty menu/cart instead of the confirmation. `history.replaceState` updates the address but server-rendered locale links retain the earlier query. | Derive locale destinations from current validated order context or refresh the route after save/submit. Cover draft and submitted orders, with/without QR.                          | Immediate polish, Phase 5/10 integration                             |
| B2 — Bugs / regressions                 | high     | **UI + source:** Clicking the already-selected Central branch on a QR visit removes the table token without a confirmation. Test 1 context disappeared. Branch anchors always build context-free URLs; confirmation runs only for a different branch.                                            | Make the current branch non-navigating or preserve its table/order context. Keep explicit confirmation and context reset for actual branch changes.                                 | Immediate polish, Phase 7/10 integration                             |
| B3 — Bugs / regressions                 | medium   | **UI:** Appearance's Open restaurant page points to localhost:3000 although this review uses local-test web :3100. Owners land in the wrong environment/unavailable app.                                                                                                                         | Make local launch configuration and generated links agree; show a clear development environment identity. Verify effective browser bundle configuration after restart.              | Immediate developer-experience polish; not a production-host finding |
| B4 — Bugs / regressions                 | low      | **UI + source:** Overview labels the dedicated full-feature fixture plan Pro. Dashboard computes any non-null plan ID as Pro.                                                                                                                                                                    | Display the resolved localized plan name; avoid inferring tier from presence of an ID.                                                                                              | Immediate polish, Phase 2                                            |
| U1 — UX / polish                        | medium   | **UI:** Signature's cover and identity push dishes far below entry; persistent cart displays a Review order CTA even with zero items. This consumes the most valuable QR-entry space.                                                                                                            | Add a controlled jump-to-menu treatment and suppress/compact empty cart; retain the premium hero while making menu discovery immediate.                                             | Immediate Phase 10 polish                                            |
| U2 — UX / polish                        | medium   | **UI:** Appearance preview is far below catalog/options. Nested page/iframe scrolling and scaled desktop preview make comparison and item inspection cumbersome, especially on narrow admin screens.                                                                                             | Sticky preview/device controls on desktop; explicit full-screen private preview with clear return; mobile preview action near template selection.                                   | Immediate Phase 10 polish                                            |
| U3 — UX / polish                        | medium   | **UI:** Draft saved/published messages work, but there is no persistent published-vs-draft identity, unsaved-change indicator, comparison or clear revert control. Browsing a template changes selection immediately.                                                                            | Show current published template and draft/dirty state, guard navigation with unsaved edits, and offer restore-published.                                                            | Immediate Phase 10 polish; version history later                     |
| U4 — UX / polish                        | medium   | **UI + source:** Garden displays an empty Coffee heading/category link after its sole latte is hidden by branch override.                                                                                                                                                                        | Remove sections with no visible items from public navigation/rendering; retain sold-out items when policy calls for them.                                                           | Immediate Phase 4/10 polish                                          |
| U5 — UX / polish                        | medium   | **UI:** Dish image pane says changes save immediately but shares Cancel / Save changes with the rest of the form. Owners can reasonably expect Cancel to undo all edits.                                                                                                                         | Separate media commit feedback and clarify Cancel scope, or stage media with the rest of the edit transaction.                                                                      | Immediate Phase 4 polish                                             |
| T1 — Template-system limitations        | medium   | **UI + scope:** Eight genuinely different layouts share only coarse spacing/image switches. Owners cannot choose a safe hero height, focal point/crop or per-template menu composition.                                                                                                          | Add a small metadata-declared option set per template with safe defaults and preview coverage; no arbitrary CSS/layout builder.                                                     | Later Phase 10 extension after immediate fixes                       |
| T2 — Template-system limitations        | medium   | **UI + scope:** Appearance is business-wide; branches show different menus/prices but cannot choose independent presentation or a different cover.                                                                                                                                               | Decide explicitly whether branch branding inherits or can safely override approved fields; expose inheritance visibly if added.                                                     | Later Phase 10 extension, only if validated restaurant demand        |
| C1 — Missing customization capabilities | high     | **UI:** Logo/cover/video customization requires externally hosted HTTPS URLs. Owners can upload dish images but cannot upload/crop their own brand assets here.                                                                                                                                  | Reuse the existing media pipeline for managed logo/cover uploads, validation, optimization and safe focal-point controls; video hosting remains separate scope.                     | Next incremental self-service work, Phase 10                         |
| C2 — Missing customization capabilities | high     | **UI + source:** Brand colors exist in both Settings and Appearance. Published appearance takes precedence over business_settings, so two owner-facing controls can disagree about the public brand.                                                                                             | Establish one canonical owner-facing brand editor or explicit inheritance/override status and deep links. Do not silently merge drafts into public settings.                        | Immediate design decision / Phase 3–10 integration                   |
| C3 — Missing customization capabilities | high     | **UI + documented design:** Closed now did not prevent either immediate order. Hours are intentionally informational; no owner order-intake pause/cutoff or customer explanation appears. This is a product-policy gap, not a regression against Phase 10's stated behavior.                     | Define immediate-order acceptance policy and expose a controlled pause/closed state enforced server-side. Explain behavior before checkout. Do not implicitly add scheduled orders. | Next small Phase 5/8/10 integration increment before live service    |
| P1 — Performance / media                | medium   | **UI + source:** Fixture media loads, but external cover/logo URLs bypass a managed optimization/reliability pipeline; template covers use raw high-priority images.                                                                                                                             | Managed assets with size limits, responsive derivatives, crop/fallback behavior and upload progress. Measure actual production image costs.                                         | Same increment as C1                                                 |
| P2 — Performance / media                | medium   | **scope:** Synthetic pictures and a five-dish menu are inadequate evidence of premium photo composition or large-menu performance. Development timing cannot establish production speed.                                                                                                         | Add a curated realistic photo/long-copy fixture and bounded large-menu benchmark; measure optimized build on constrained network/device.                                            | Immediate validation gate, no new product feature                    |
| M1 — Multilingual / RTL                 | low      | **UI:** `read_only` and other raw role codes surface on overview/sidebar; some counts read “1 dishes.” Translated content itself and RTL alignment worked.                                                                                                                                       | Localize role labels/count grammar consistently, keep codes internal.                                                                                                               | Immediate shared i18n polish                                         |
| M2 — Multilingual / RTL                 | medium   | **UI + scope:** Translation fields are optional and selectable by locale, but no completeness/fallback summary helps an owner know whether all three customer experiences are ready.                                                                                                             | Add a non-blocking language completeness checklist and clear fallback preview.                                                                                                      | Later Phase 4/10 extension                                           |
| F1 — Future enhancements                | medium   | **DOM + source:** Public slug has restaurant title/canonical, but description remains generic Darb marketing copy, no hreflang links or Restaurant structured data were observed. QR/legacy route uses generic platform metadata.                                                                | Complete restaurant-specific metadata/localized alternates and structured data from approved existing fields; retain noindex on transactional/QR views.                             | Small public launch-readiness increment after functional polish      |
| F2 — Future enhancements                | low      | **UI + scope:** Customer confirmation depends on Refresh status and exposes long technical references prominently. No collection/serving instructions or polished readiness communication.                                                                                                       | Improve human-readable reference hierarchy and explain next steps; evaluate safe status refresh separately from paid notifications.                                                 | Later Phase 5/8 experience refinement                                |

No blocker-severity failure was observed: both real local order journeys completed, owner content
updates worked and restricted routes denied access. High findings are launch risks for context,
service expectations and owner independence, not evidence of a tenant-security breach.

## Ranked gaps and next incremental work

1. Fix **B1/B2** first: preserve order/table context across language and branch navigation.
2. Resolve **C2/C3**: one understandable brand source and explicit order-intake policy.
3. Deliver **C1/P1**: owner-managed logo/cover assets instead of requiring hosting knowledge.
4. Address **U1–U5**: quick menu entry, usable preview, clear publishing state, empty categories,
   and consistent media-save semantics. Include B3/B4/M1 as small fixes.
5. Add launch evidence **P2/F1**: realistic photographs/large menus, production performance,
   accessibility review and restaurant SEO completion.

**Recommended next increment: controlled self-service and customer-continuity polish on top of
Phases 4–10.** Keep it small and acceptance-driven rather than beginning another major feature phase.
Suggested acceptance: submitted/draft order and QR context survive language changes; current-branch
click cannot unlink a table; an owner uploads a logo/cover, understands draft vs live, previews all
languages/devices and publishes without external hosting or developer help; closed-order behavior
is explicit and enforced; no regressions in existing pricing, RBAC, payments or KDS tests.

## Longer-term mapping without replacing the roadmap

- **Phase 4 content extension:** translation completeness, better branch inheritance and media workflow.
- **Phase 5/6 experience refinement:** clearer status/collection instructions; real gateway choice stays
  a separately authorized integration, not part of this audit recommendation.
- **Phase 7:** preserve QR capability lifecycle and context as the customer surface evolves.
- **Phases 8–9:** maintain branch-scoped KDS, stations, staff and operational history; expose intake
  control through existing operations rather than introducing a second order system.
- **Phase 10 extension:** supported per-template options, managed brand assets, private full-screen
  preview, publishing confidence, optional branch overrides and restaurant SEO foundations.
- **Future accelerator only:** Future assistance may suggest text/crops within those controlled fields,
  with owner review and the same validation/publish boundaries. No automated generation, free-form builders,
  analytics or speculative feature was added or scheduled here.

The repository documents completed Phases 1–10 but does not define a canonical numbered Phase 11
scope. These are ranked refinements mapped to existing work, not a replacement future roadmap.

## Remaining validation limits

Not a full accessibility certification, destructive CRUD run, API penetration test or cross-browser
suite. No new image upload, every role's write mutation, real gateway, real device/audio, production
load, external video playback or large photographic catalog was tested. Tablet/desktop breadth is
preview-based; screenshots were representative, not a pixel-by-pixel examination of every state.
SEO assessment is DOM/source inspection, not a search-engine indexing or ranking test.

## Self-service polish increment — 2026-09-20

Implementation follow-up (not a new major phase):

- **B1 resolved:** locale links retain the deep route, current query and fragment. Saving a guest
  draft writes its order reference into the URL; the existing branch/table-scoped cart retains
  fulfillment mode across locale reloads. Customer details remain server-side in the guest draft.
- **B2 resolved:** current-branch navigation preserves context; changing branches still asks for
  confirmation and deliberately starts a separate branch context. Revoked tokens remain rejected.
- **C2 resolved:** Settings links owners/admins to Appearance and no longer edits customer-facing
  colors. Appearance remains the draft/publish authority; legacy branding remains a fallback.
- **C1 implemented, deployment validation pending:** managed logo/cover upload accepts bounded
  JPEG/PNG/WebP, decodes and converts to optimized WebP. Private tenant-scoped immutable objects
  prevent overwriting a published image when editing its draft. Migration 11 is authored only.
- **C3 resolved through explicit existing policy:** public menus explain open/closed/unknown hours
  before configuration/checkout. Closed orders are sent immediately for restaurant acceptance;
  they are not scheduled. This increment does not introduce a hard ordering-hours cutoff.
- **U3 resolved:** Appearance distinguishes unsaved edits, saved draft, current live settings and
  private preview; displays the live template, supports restoring published settings to the editor,
  and reports save/publish/upload outcomes. Dirty drafts warn on browser unload.

All eight templates retain the shared restaurant/order engine. Remaining audit findings and the
roadmap above are unchanged. Browser-unload protection is not a universal internal-navigation
confirmation. Managed object deletion/garbage collection is intentionally deferred: removal changes
only the draft until publication; old objects stay private so existing published references survive.

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
