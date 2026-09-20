# Phase 10.x — Template Excellence & Self-Service UX

## Audit before implementation

Evidence: source review of catalog, renderer, styles, editor, validation/RPC and managed media;
rendered local-fixture screenshots of all eight designs in the existing multilingual responsive
suite. These screenshots expose composition, but synthetic media is not proof of photographic art
direction. The original roadmap remains intact; Analytics does not begin in this increment.

| Classification                      | Finding                                                                                                                                                                                                | Decision                                                                                                                                            |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Already excellent / leave unchanged | One restaurant projection/configurator, authoritative pricing, branch and QR resolution; template selection writes only appearance. Existing persisted order tests cover all eight.                    | Preserve engine, identities, permissions and operations.                                                                                            |
| Already excellent / leave unchanged | Eight actual hero structures: cinematic overlap, editorial masthead, text-only, café arch, compact counter, framed graphic, dark panorama, bakery banner.                                              | Keep eight; no quantity-driven additions.                                                                                                           |
| Template differentiation issue      | Below the hero, the same information sequence dominates; Quick is excessively tall for scanning, luxury reads as ordinary rows, bakery cards waste small-screen space with single items.               | Strengthen signature/night/quick/bakery rhythm and use template-specific layout defaults.                                                           |
| Missing customization capability    | Colors/media/density cannot change information priority, cover crop, navigation or card character. Same-template brands mostly change imagery/color.                                                   | Optional strict composition settings, metadata-declared safe choices; existing content editor remains the category-order authority.                 |
| Architectural limitation            | SQL accepts exactly nine appearance keys. New controls cannot truthfully persist without extending the contract.                                                                                       | Author one additive migration accepting an optional validated layout object. Legacy nine-key snapshots remain valid; no operational schema changes. |
| Polish required                     | Owner scrolls past the catalog and controls to inspect changes. No direct edit/preview navigation; saved/published statuses already work.                                                              | Sticky workflow shortcuts, clear control grouping and live iframe preview.                                                                          |
| Performance/media issue             | Optimized uploads exist, but covers always deliver the largest image; crop fixed to center. Failed images show broken-image UI; video poster incorrectly treats logical media references as real URLs. | Bounded responsive cover delivery, safe focal presets, explicit fallback and correct poster resolver.                                               |
| Multilingual/RTL issue              | Shared fonts and logical layout work; display tracking and tight headline line-height are inappropriate for Arabic.                                                                                    | Remove tracking and relax display line-height for RTL languages; preserve font stack.                                                               |
| Polish required                     | Empty visible categories appear in navigation.                                                                                                                                                         | Suppress empty presentation sections without editing menu data.                                                                                     |
| Already excellent / leave unchanged | Contrast-computed button ink, private draft previews, atomic publish revision and private media boundaries.                                                                                            | Reuse guardrails; custom CSS/code/fonts remain impossible.                                                                                          |

## Style coverage and intended composition

| Template      | Restaurant direction             | Defining composition                                                              |
| ------------- | -------------------------------- | --------------------------------------------------------------------------------- |
| Signature     | Luxury / fine dining             | Cinematic image, overlapping logo, centered identity, generous course divisions   |
| Editorial     | Image-heavy editorial            | Oversized masthead, numbered category index, asymmetric image-led grid            |
| Essential     | Minimal premium                  | Text identity, restrained rows, desktop side navigation                           |
| Coffee House  | Modern café                      | Arched portrait, warm surfaces, rounded compact cards                             |
| Quick Counter | Fast casual / compact menu-first | Compact identity, persistent category rail, dense scan-friendly rows              |
| Bold Table    | Street food                      | Framed title, graphic category tiles, large prices and bordered cards             |
| After Dark    | Premium evening dining           | Dark controlled surfaces, narrow panoramic photography, intimate typographic menu |
| Bake & Gather | Bakery / dessert                 | Shop-sign identity, short banner, multi-column visual product catalog             |

No arbitrary section builder: owners choose information-before/after-menu, category navigation,
cover emphasis/focal point, card treatment, CTA treatment, footer detail and surface mood within
supported choices. Menu/category/item order stays in the existing menu editor. Names, hours,
contacts and social content stay in their existing business/branch editors. Settings affect
presentation only; template switching must retain media and saved choices, even when a template
does not currently render an option. Unknown options never become CSS values.

## Validated implementation outcome

Following operator application of migration 12, all 56 browser tests and 24 local composition
SQL assertions pass. Typecheck, lint, unit tests, build and formatting pass. Exact draft/published
palette and composition persistence, unsafe-option rejection and tenant permissions are verified.
All eight templates retain ordering coverage, with EN/AR/HE responsive previews, configured-cart
continuity, same-template brand variation and image crop/load/failure checks.

The retained synthetic fixture isolates layout differences; it is not a final photographic brand
portfolio. Physical-device/cross-browser review and production media load remain limitations.
Phase 10.x validation is complete. No migrations or remote commands were run; Analytics has not started.
