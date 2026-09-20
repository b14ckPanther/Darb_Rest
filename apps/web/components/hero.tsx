import React from "react";
import Link from "next/link";
import { getDictionary, getDirection, type SupportedLocale } from "@darb-rest/i18n";
import { ArrowEnd } from "@darb-rest/icons";

export function Hero({ locale }: { locale: SupportedLocale }) {
  const dict = getDictionary(locale);
  const direction = getDirection(locale);

  return (
    <section
      className="marketing-hero relative min-h-[100svh] flex items-end overflow-hidden"
      aria-label="Hero"
    >
      <picture className="absolute inset-0 hero-image-animate">
        {/* Mobile (< 768px): AVIF → WebP → PNG */}
        <source
          srcSet="/images/hero/optimized/hero-mobile.avif"
          media="(max-width: 767px)"
          type="image/avif"
        />
        <source
          srcSet="/images/hero/optimized/hero-mobile.webp"
          media="(max-width: 767px)"
          type="image/webp"
        />
        <source srcSet="/images/hero/hero-mobile.png" media="(max-width: 767px)" type="image/png" />
        {/* Tablet (768–1199px): AVIF → WebP → PNG */}
        <source
          srcSet="/images/hero/optimized/hero-tablet.avif"
          media="(min-width: 768px) and (max-width: 1199px)"
          type="image/avif"
        />
        <source
          srcSet="/images/hero/optimized/hero-tablet.webp"
          media="(min-width: 768px) and (max-width: 1199px)"
          type="image/webp"
        />
        <source
          srcSet="/images/hero/hero-tablet.png"
          media="(min-width: 768px) and (max-width: 1199px)"
          type="image/png"
        />
        {/* Desktop (≥ 1200px): AVIF → WebP → PNG */}
        <source
          srcSet="/images/hero/optimized/hero-desktop.avif"
          media="(min-width: 1200px)"
          type="image/avif"
        />
        <source
          srcSet="/images/hero/optimized/hero-desktop.webp"
          media="(min-width: 1200px)"
          type="image/webp"
        />
        <source
          srcSet="/images/hero/hero-desktop.png"
          media="(min-width: 1200px)"
          type="image/png"
        />
        <img
          src="/images/hero/hero-desktop.png"
          alt=""
          role="presentation"
          width={1920}
          height={1080}
          className="h-full w-full object-cover"
          fetchPriority="high"
          decoding="async"
        />
      </picture>

      {/* Atmospheric Gradient Overlays */}
      <div
        className="absolute inset-0 bg-gradient-to-t from-[var(--darb-green-dark)] via-[var(--darb-green-dark)]/70 to-transparent"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-gradient-to-r from-[var(--darb-green-dark)]/40 to-transparent rtl:bg-gradient-to-l"
        aria-hidden="true"
      />

      {/* Hero Content */}
      <div className="marketing-hero-content relative z-10 w-full pb-16 pt-32 sm:pb-20 lg:pb-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="max-w-2xl">
            {/* Eyebrow */}
            <p
              className="hero-animate mb-4 text-sm font-medium tracking-wide text-[var(--color-primary)] sm:text-base"
              style={{ letterSpacing: "var(--tracking-wide)" }}
            >
              {dict.web.heroEyebrow}
            </p>

            {/* Headline */}
            <h1
              className="hero-animate-delay-1 font-extrabold text-white"
              style={{
                fontSize: "var(--text-hero)",
                lineHeight: "var(--leading-hero)",
                letterSpacing: "var(--tracking-tight)",
              }}
            >
              {dict.web.heroTitle}
            </h1>

            {/* Supporting text */}
            <p
              className="hero-animate-delay-2 mt-5 max-w-lg text-white/80 sm:mt-6"
              style={{
                fontSize: "var(--text-body-lg)",
                lineHeight: "var(--leading-body)",
              }}
            >
              {dict.web.heroSubtitle}
            </p>

            {/* CTA Group */}
            <div className="hero-animate-delay-3 mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:items-center sm:gap-4">
              {/* Primary CTA */}
              <Link
                href={`/${locale}/get-started`}
                className="inline-flex h-13 items-center justify-center gap-2.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-7 text-base font-semibold text-[var(--color-primary-fg)] shadow-lg transition-all hover:bg-[var(--color-primary-hover)] hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--darb-green-dark)] active:translate-y-0"
                style={{ transitionDuration: "var(--motion-fast)" }}
              >
                <span>{dict.web.heroCta}</span>
                <ArrowEnd direction={direction} size={18} />
              </Link>

              {/* Secondary CTA */}
              <Link
                href={`/${locale}#product`}
                className="inline-flex h-13 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-white/25 px-7 text-base font-medium text-white/90 backdrop-blur-sm transition-all hover:bg-white/10 hover:border-white/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--darb-green-dark)]"
                style={{ transitionDuration: "var(--motion-fast)" }}
              >
                {dict.web.heroCtaSecondary}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
