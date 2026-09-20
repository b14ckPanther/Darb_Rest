# Mobile hero and sign-in refinement

The marketing hero now uses a bounded stable-viewport minimum height below 768px, a mobile
headline scale, tighter spacing and stacked actions. The existing mobile art asset and desktop/
tablet art direction remain intact. The architectural arch and pendant focal area were visually
reviewed. Header controls keep 44px minimum touch targets with a smaller mobile logo and safe-area
padding. Existing entrance/menu motion and reduced-motion behavior are retained.

Sign-in below 1024px uses an ivory atmospheric background, a compact green-accented form card,
clearer heading hierarchy and 16px inputs to avoid iOS automatic focus zoom. Inputs and form stay
in document flow; no fixed footer or keyboard overlay was introduced. Email icon placement follows
the LTR email field even on RTL pages. Language controls fit 375px without horizontal overflow.
The desktop split-image composition, form submission, password toggle and auth routes are preserved.

## Validation

Captured and inspected temporary screenshots for EN/AR/HE at 375x812, 390x844, 393x852, 430x932,
768x1024, 834x1194 and desktop 1440x1000. Screenshots are ignored local QA artifacts.

At all six required viewports, both web hero actions and the sign-in logo, heading, email, password
and submit control are visible without scrolling, with no horizontal document overflow. At 390x844,
web action bottom edges are 634px and 692px in all three locales. The admin submit bottom edge is
468px in English/Hebrew and 503px in Arabic. Native script typography and RTL reading order were
reviewed in the screenshots. Desktop uses its existing illustration-side logo, not the hidden
mobile top-bar logo.

Focused browser tests cover all six sizes and locales, both hero actions, form visibility,
horizontal overflow, password reveal without value loss, 16px input text and a reduced 480px
viewport with focused password field and reachable submit control. Reduced-motion mode is used
for deterministic geometry checks. The complete suite passes 68 tests.

Typecheck, lint, unit tests, production build with explicit HTTPS build-check origins, and
formatting pass. No schema, business logic or operational flows changed.

## Limits

Screenshots and focus checks used local Chromium. Real iPhone Safari browser-chrome transitions,
notches, actual software keyboard/AutoFill and VoiceOver still need physical-device QA. Stable
viewport units, safe-area padding and in-flow forms are implemented, but emulated viewport resizing
is not evidence of physical keyboard behavior. Development screenshots include local test-account
controls and the framework indicator; these are absent from production. No deployment was made.
