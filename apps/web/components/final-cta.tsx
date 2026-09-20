import React from "react";
import { getDictionary, getDirection, type SupportedLocale } from "@darb-rest/i18n";
import { adminUrl } from "./admin-url";
import { ArrowEnd } from "@darb-rest/icons";

export function FinalCta({ locale }: { locale: SupportedLocale }) {
  const dict = getDictionary(locale);
  const direction = getDirection(locale);

  return (
    <section
      className="relative bg-[var(--darb-green-deep)] text-white"
      style={{ paddingBlock: "var(--section-py)" }}
    >
      {/* Subtle decorative gradient */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-[var(--darb-green-mid)]/30 to-transparent"
        aria-hidden="true"
      />

      <div className="relative mx-auto px-5 sm:px-8" style={{ maxWidth: "var(--content-narrow)" }}>
        <div className="reveal text-center">
          <h2
            className="font-bold"
            style={{
              fontSize: "var(--text-display)",
              lineHeight: "var(--leading-display)",
              letterSpacing: "var(--tracking-tight)",
            }}
          >
            {dict.web.finalCtaTitle}
          </h2>
          <p
            className="mx-auto mt-4 max-w-md text-white/70"
            style={{
              fontSize: "var(--text-body-lg)",
              lineHeight: "var(--leading-body)",
            }}
          >
            {dict.web.finalCtaDesc}
          </p>

          <div className="mt-10">
            <a
              href={adminUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-14 items-center justify-center gap-2.5 rounded-[var(--radius-md)] bg-[var(--color-primary)] px-8 text-base font-semibold text-[var(--color-primary-fg)] shadow-lg transition-all hover:bg-[var(--color-primary-hover)] hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--darb-green-deep)] active:translate-y-0"
              style={{ transitionDuration: "var(--motion-fast)" }}
            >
              <span>{dict.web.finalCta}</span>
              <ArrowEnd direction={direction} size={18} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
