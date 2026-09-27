/**
 * Renders Darb REST's localized marketing share images (1200x630) from existing approved assets:
 * the restaurant hero photograph, the transparent dark logo derivative, and Darb's architectural
 * doorway elevation (never mirrored). Output: `public/brand/social/rest-og-{ar,he,en}.jpg`.
 *
 * Usage: node apps/web/scripts/render-social-images.mjs   (needs network access for Google Fonts)
 */
import { mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "@playwright/test";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const output = join(root, "public/brand/social");

const copy = {
  ar: {
    path: "من مسارات درب",
    title: "تجربة رقمية تليق بمطعمك",
    line: "منيو أنيق، هوية واضحة، فروع مرتبة، وتجربة أسهل لكل زبون.",
  },
  he: {
    path: "מסלול של Darb",
    title: "חוויה דיגיטלית שראויה למסעדה שלך",
    line: "תפריט מעוצב, זהות מותג ברורה, סניפים מסודרים, וחוויה נוחה יותר לכל אורח.",
  },
  en: {
    path: "A Darb path",
    title: "A premium digital restaurant experience",
    line: "Premium menus, clear brand identity, and a smoother experience for every guest.",
  },
};

const fontFamily = { ar: "Cairo", he: "Heebo", en: "Ubuntu" };
const doorwayFrame =
  "M2 96V31Q2 26 7 23.5L51 6Q55 4.5 58.5 6Q62 7.5 62 12V96H53V22Q53 17.5 49 18L15 32Q11 33.5 11 38V96Z";
const doorwayOpening = "M11 96V38Q11 33.5 15 32L49 18Q53 17.5 53 22V96Z";

async function dataUri(path, type) {
  return `data:${type};base64,${(await readFile(path)).toString("base64")}`;
}

function page({ locale, photo, logo }) {
  const rtl = locale !== "en";
  const text = copy[locale];
  return `<!doctype html>
<html lang="${locale}" dir="${rtl ? "rtl" : "ltr"}">
<head>
<meta charset="utf-8" />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@600;700&family=Heebo:wght@500;600&family=Ubuntu:wght@500;700&display=block" />
<style>
  * { box-sizing: border-box; margin: 0; }
  html, body { width: 1200px; height: 630px; overflow: hidden; }
  body { position: relative; color: #fffdf6; font-family: "${fontFamily[locale]}", "Ubuntu", sans-serif;
    background: radial-gradient(ellipse 36% 70% at ${rtl ? "24%" : "76%"} 62%, rgb(218 166 77 / 22%), transparent 70%), #051711; }
  .floor { position: absolute; inset: auto 0 0; height: 70px; background: linear-gradient(180deg, transparent, rgb(218 166 77 / 10%)); border-top: 1px solid rgb(218 166 77 / 22%); }
  .door { position: absolute; bottom: 70px; ${rtl ? "left" : "right"}: 110px; width: 360px; height: 540px; direction: ltr; }
  .door svg { width: 100%; height: 100%; overflow: visible; }
  .rail { position: absolute; inset-block: 0; inset-inline-start: 72px; width: 2px; background: #daa64d; }
  .rail::before { content: ""; position: absolute; top: 96px; inset-inline-start: -6px; width: 14px; height: 14px; background: #daa64d; transform: rotate(45deg); }
  .content { position: absolute; inset-block: 64px 60px; inset-inline-start: 120px; width: 560px; display: grid; align-content: space-between; }
  .logo { height: 78px; width: auto; justify-self: start; }
  .path { display: inline-flex; align-items: center; gap: 10px; color: #f2e3bd; font-size: 22px; font-weight: 600; }
  .path::before { content: ""; width: 11px; height: 11px; background: #daa64d; transform: rotate(45deg); }
  h1 { margin-top: 14px; font-size: ${locale === "en" ? 62 : 60}px; font-weight: ${locale === "ar" ? 700 : 600}; line-height: ${locale === "ar" ? 1.25 : 1.06}; letter-spacing: ${locale === "en" ? "-0.035em" : "0"}; }
  p { margin-top: 18px; color: rgb(255 253 246 / 76%); font-size: 23px; line-height: 1.45; max-width: 500px; }
  .domain { display: inline-flex; align-items: center; gap: 12px; color: #f2e3bd; font-family: "Ubuntu", sans-serif; font-size: 22px; font-weight: 500; letter-spacing: 0.02em; direction: ltr; justify-self: start; }
  .domain::before { content: ""; width: 34px; height: 2px; background: #daa64d; }
</style>
</head>
<body>
  <div class="floor"></div>
  <div class="door">
    <svg viewBox="0 0 64 96" preserveAspectRatio="xMidYMax meet">
      <defs><clipPath id="opening"><path d="${doorwayOpening}" /></clipPath></defs>
      <image href="${photo}" x="8" y="10" width="48" height="86" preserveAspectRatio="xMidYMid slice" clip-path="url(#opening)" />
      <path d="${doorwayFrame}" fill="#0f3326" stroke="#daa64d" stroke-width="0.35" />
      <path d="${doorwayOpening}" fill="none" stroke="#e9bd69" stroke-width="0.5" />
    </svg>
  </div>
  <div class="rail"></div>
  <div class="content">
    <img class="logo" src="${logo}" alt="" />
    <div>
      <span class="path">${text.path}</span>
      <h1>${text.title}</h1>
      <p>${text.line}</p>
    </div>
    <div class="domain">rest.darb.co.il</div>
  </div>
</body>
</html>`;
}

await mkdir(output, { recursive: true });
const photo = await dataUri(
  join(root, "public/images/hero/optimized/hero-mobile.webp"),
  "image/webp",
);
const logo = await dataUri(
  join(root, "public/brand/optimized/darb-rest-logo-dark-tight.webp"),
  "image/webp",
);
const browser = await chromium.launch();

for (const locale of ["ar", "he", "en"]) {
  const tab = await browser.newPage({
    deviceScaleFactor: 2,
    viewport: { width: 1200, height: 630 },
  });
  await tab.setContent(page({ locale, photo, logo }), { waitUntil: "networkidle" });
  await tab.evaluate(() => document.fonts.ready);
  const png = await tab.screenshot({ type: "png" });
  await sharp(png)
    .resize(1200, 630)
    .jpeg({ mozjpeg: true, quality: 86 })
    .toFile(join(output, `rest-og-${locale}.jpg`));
  await tab.close();
  globalThis.console.log(`rendered rest-og-${locale}.jpg`);
}

await browser.close();
