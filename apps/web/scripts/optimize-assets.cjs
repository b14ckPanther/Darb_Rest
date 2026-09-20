/**
 * Hero & Brand Asset Optimization Script
 * Generates AVIF + WebP derivatives from source PNGs
 */
const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const WEB_PUBLIC = path.join(__dirname, "..", "public");
const HERO_SRC = path.join(WEB_PUBLIC, "images", "hero");
const HERO_OUT = path.join(WEB_PUBLIC, "images", "hero", "optimized");
const BRAND_SRC = path.join(WEB_PUBLIC, "brand");
const BRAND_OUT = path.join(WEB_PUBLIC, "brand", "optimized");

const HERO_FILES = ["hero-desktop", "hero-tablet", "hero-mobile"];

async function optimizeHero() {
  fs.mkdirSync(HERO_OUT, { recursive: true });
  const results = [];

  for (const name of HERO_FILES) {
    const src = path.join(HERO_SRC, `${name}.png`);
    const srcStat = fs.statSync(src);

    // AVIF
    const avifOut = path.join(HERO_OUT, `${name}.avif`);
    await sharp(src).avif({ quality: 68, effort: 4 }).toFile(avifOut);
    const avifStat = fs.statSync(avifOut);

    // WebP
    const webpOut = path.join(HERO_OUT, `${name}.webp`);
    await sharp(src).webp({ quality: 82, effort: 4 }).toFile(webpOut);
    const webpStat = fs.statSync(webpOut);

    results.push({
      name,
      original: srcStat.size,
      avif: avifStat.size,
      webp: webpStat.size,
    });
  }

  return results;
}

async function optimizeBrand() {
  fs.mkdirSync(BRAND_OUT, { recursive: true });
  const results = [];
  const files = fs.readdirSync(BRAND_SRC).filter((f) => f.endsWith(".png") && !f.includes("optimized"));

  for (const file of files) {
    const src = path.join(BRAND_SRC, file);
    const srcStat = fs.statSync(src);
    const baseName = file.replace(".png", "");

    // WebP for brand logos with alpha channel preservation
    const webpOut = path.join(BRAND_OUT, `${baseName}.webp`);
    await sharp(src).webp({ quality: 92, effort: 4, lossless: false, alphaQuality: 100 }).toFile(webpOut);
    const webpStat = fs.statSync(webpOut);

    if (baseName === "darb-rest-logo-dark") {
      const transparentOut = path.join(BRAND_SRC, "darb-rest-logo-dark-transparent.webp");
      await sharp(src).webp({ quality: 95, effort: 6, alphaQuality: 100 }).toFile(transparentOut);
    }

    results.push({
      name: file,
      original: srcStat.size,
      webp: webpStat.size,
    });
  }

  // PWA derivatives
  const pwaSource = path.join(BRAND_SRC, "darb-rest-pwa-icon.png");
  if (fs.existsSync(pwaSource)) {
    await sharp(pwaSource).resize(192, 192, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toFile(path.join(BRAND_OUT, "pwa-192.png"));
    await sharp(pwaSource).resize(512, 512, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toFile(path.join(BRAND_OUT, "pwa-512.png"));
    await sharp(pwaSource).resize(180, 180, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } }).png().toFile(path.join(BRAND_OUT, "apple-touch-icon.png"));
  }

  return results;
}

function formatBytes(b) {
  return (b / 1024).toFixed(1) + " KB";
}

async function main() {
  console.log("=== Hero Image Optimization ===");
  const heroResults = await optimizeHero();
  for (const r of heroResults) {
    const avifReduction = (((r.original - r.avif) / r.original) * 100).toFixed(1);
    const webpReduction = (((r.original - r.webp) / r.original) * 100).toFixed(1);
    console.log(`${r.name}: PNG=${formatBytes(r.original)} → AVIF=${formatBytes(r.avif)} (-${avifReduction}%) | WebP=${formatBytes(r.webp)} (-${webpReduction}%)`);
  }

  console.log("\n=== Brand Asset Optimization ===");
  const brandResults = await optimizeBrand();
  for (const r of brandResults) {
    const reduction = (((r.original - r.webp) / r.original) * 100).toFixed(1);
    console.log(`${r.name}: PNG=${formatBytes(r.original)} → WebP=${formatBytes(r.webp)} (-${reduction}%)`);
  }

  console.log("\n=== PWA Derivatives Generated ===");
  console.log("pwa-192.png, pwa-512.png, apple-touch-icon.png");
}

main().catch(console.error);
