import React from "react";
import Link from "next/link";
import { getDictionary, getDirection, type SupportedLocale } from "@darb-rest/i18n";
import { ArrowEnd } from "@darb-rest/icons";
import { doorwayFramePath, doorwayOpeningPath } from "./marketing/doorway";

/**
 * Arrival: the lit doorway from darb.co.il opens onto the restaurant. The photograph is seen
 * through Darb's architectural opening; the copy and actions are visible from the first paint.
 */
export function Hero({ locale }: { locale: SupportedLocale }) {
  const dict = getDictionary(locale);
  const direction = getDirection(locale);

  return (
    <section className="marketing-hero rs-hero" aria-labelledby="rs-hero-title">
      <div className="rs-hero__inner">
        <div className="rs-hero__copy">
          <p className="rs-hero__path">
            <span className="rs-diamond" aria-hidden="true" />
            <a href={`https://darb.co.il/${locale}`}>{dict.web.darbPath}</a>
          </p>
          <h1 id="rs-hero-title">{dict.web.heroTitle}</h1>
          <p className="rs-hero__subtitle">{dict.web.heroSubtitle}</p>
          <div className="rs-hero__actions hero-animate-delay-3">
            <Link className="rs-button rs-button--gold" href={`/${locale}/get-started`}>
              <span>{dict.web.heroCta}</span>
              <ArrowEnd className="rs-arrow" direction={direction} size={18} />
            </Link>
            <Link className="rs-button rs-button--line" href={`/${locale}#product`}>
              {dict.web.heroCtaSecondary}
            </Link>
          </div>
        </div>

        <div className="rs-hero__stage" aria-hidden="true">
          <div className="rs-door">
            <div className="rs-door__view">
              <picture>
                <source srcSet="/images/hero/optimized/hero-mobile.avif" type="image/avif" />
                <source srcSet="/images/hero/optimized/hero-mobile.webp" type="image/webp" />
                <img
                  src="/images/hero/hero-mobile.png"
                  alt=""
                  width={941}
                  height={1672}
                  fetchPriority="high"
                  decoding="async"
                />
              </picture>
              <span className="rs-door__light" />
            </div>
            <svg className="rs-door__frame" viewBox="0 0 64 96" preserveAspectRatio="none">
              <path className="rs-door__frame-body" d={doorwayFramePath} />
              <path className="rs-door__frame-rim" d={doorwayOpeningPath} />
            </svg>
            <span className="rs-door__floor" />
          </div>
        </div>
      </div>
    </section>
  );
}
