import React from "react";
import { getDictionary, type SupportedLocale } from "@darb-rest/i18n";

export function ValueSection({ locale }: { locale: SupportedLocale }) {
  const dict = getDictionary(locale);

  const values = [
    { title: dict.web.value1Title, desc: dict.web.value1Desc },
    { title: dict.web.value2Title, desc: dict.web.value2Desc },
    { title: dict.web.value3Title, desc: dict.web.value3Desc },
    { title: dict.web.value4Title, desc: dict.web.value4Desc },
  ];

  return (
    <section
      className="relative bg-[var(--bg-surface)]"
      style={{ paddingBlock: "var(--section-py)" }}
    >
      <div className="mx-auto px-5 sm:px-8" style={{ maxWidth: "var(--content-max)" }}>
        {/* Editorial Headline */}
        <div className="reveal mb-14 max-w-3xl lg:mb-20">
          <h2
            className="font-bold text-[var(--fg-default)]"
            style={{
              fontSize: "var(--text-display)",
              lineHeight: "var(--leading-display)",
              letterSpacing: "var(--tracking-tight)",
            }}
          >
            {dict.web.valueTitle}
          </h2>
          <p
            className="mt-4 max-w-2xl text-[var(--fg-muted)]"
            style={{
              fontSize: "var(--text-body-lg)",
              lineHeight: "var(--leading-body)",
            }}
          >
            {dict.web.valueSubtitle}
          </p>
        </div>

        {/* Value Grid — 2x2 editorial layout */}
        <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:gap-x-16 lg:gap-y-14">
          {values.map((item, i) => (
            <div key={i} className={`reveal reveal-delay-${i + 1} group`}>
              {/* Accent line */}
              <div
                className="mb-4 h-0.5 w-10 rounded-full bg-[var(--color-primary)] transition-all group-hover:w-14"
                style={{ transitionDuration: "var(--motion-medium)" }}
                aria-hidden="true"
              />
              <h3
                className="font-semibold text-[var(--fg-default)]"
                style={{
                  fontSize: "var(--text-subheading)",
                  lineHeight: "var(--leading-heading)",
                }}
              >
                {item.title}
              </h3>
              <p
                className="mt-2 max-w-md text-[var(--fg-muted)]"
                style={{
                  fontSize: "var(--text-body)",
                  lineHeight: "var(--leading-body)",
                }}
              >
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
