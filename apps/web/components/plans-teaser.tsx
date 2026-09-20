import React from "react";
import Link from "next/link";
import { getDictionary, getDirection, type SupportedLocale } from "@darb-rest/i18n";
import { ArrowEnd } from "@darb-rest/icons";

export function PlansTeaser({ locale }: { locale: SupportedLocale }) {
  const dict = getDictionary(locale);
  const direction = getDirection(locale);

  return (
    <section
      id="plans"
      className="relative bg-[var(--warm-ivory)]"
      style={{ paddingBlock: "var(--section-py-sm)" }}
    >
      <div className="mx-auto px-5 sm:px-8" style={{ maxWidth: "var(--content-narrow)" }}>
        <div className="reveal text-center">
          <h2
            className="font-bold text-[var(--fg-default)]"
            style={{
              fontSize: "var(--text-display)",
              lineHeight: "var(--leading-display)",
              letterSpacing: "var(--tracking-tight)",
            }}
          >
            {dict.web.plansTitle}
          </h2>
          <p
            className="mx-auto mt-4 max-w-lg text-[var(--fg-muted)]"
            style={{
              fontSize: "var(--text-body-lg)",
              lineHeight: "var(--leading-body)",
            }}
          >
            {dict.web.plansDesc}
          </p>

          {/* Teaser CTA */}
          <div className="mt-8">
            <Link
              href={`/${locale}/pricing`}
              className="group inline-flex items-center gap-2 text-base font-semibold text-[var(--color-primary)] transition-colors hover:text-[var(--color-primary-hover)]"
              style={{ transitionDuration: "var(--motion-fast)" }}
            >
              <span>{dict.web.plansCtaText}</span>
              <ArrowEnd
                direction={direction}
                size={18}
                className="transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1"
              />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
