import React from "react";
import { getDictionary, type SupportedLocale } from "@darb-rest/i18n";

export function ExperienceSection({ locale }: { locale: SupportedLocale }) {
  const dict = getDictionary(locale);

  const steps = [
    { num: "01", title: dict.web.step1Title, desc: dict.web.step1Desc },
    { num: "02", title: dict.web.step2Title, desc: dict.web.step2Desc },
    { num: "03", title: dict.web.step3Title, desc: dict.web.step3Desc },
    { num: "04", title: dict.web.step4Title, desc: dict.web.step4Desc },
    { num: "05", title: dict.web.step5Title, desc: dict.web.step5Desc },
  ];

  return (
    <section
      id="product"
      className="relative bg-[var(--warm-ivory)]"
      style={{ paddingBlock: "var(--section-py)" }}
    >
      <div className="mx-auto px-5 sm:px-8" style={{ maxWidth: "var(--content-max)" }}>
        {/* Section Header */}
        <div className="reveal mb-14 text-center lg:mb-20">
          <h2
            className="font-bold text-[var(--fg-default)]"
            style={{
              fontSize: "var(--text-display)",
              lineHeight: "var(--leading-display)",
              letterSpacing: "var(--tracking-tight)",
            }}
          >
            {dict.web.experienceTitle}
          </h2>
          <p
            className="mx-auto mt-4 max-w-xl text-[var(--fg-muted)]"
            style={{
              fontSize: "var(--text-body-lg)",
              lineHeight: "var(--leading-body)",
            }}
          >
            {dict.web.experienceSubtitle}
          </p>
        </div>

        {/* Steps — editorial vertical flow */}
        <div className="mx-auto max-w-3xl">
          {steps.map((step, i) => (
            <div
              key={step.num}
              className={`reveal reveal-delay-${Math.min(i + 1, 4)} group relative flex gap-6 sm:gap-8 ${
                i < steps.length - 1 ? "pb-12 sm:pb-14" : ""
              }`}
            >
              {/* Timeline connector */}
              <div className="flex flex-col items-center">
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--darb-green-deep)] text-sm font-bold text-white transition-all group-hover:bg-[var(--color-primary)] sm:h-14 sm:w-14"
                  style={{ transitionDuration: "var(--motion-medium)" }}
                >
                  {step.num}
                </div>
                {i < steps.length - 1 && (
                  <div className="mt-2 w-px flex-1 bg-[var(--border-default)]" aria-hidden="true" />
                )}
              </div>

              {/* Content */}
              <div className="pt-2 pb-2 sm:pt-3">
                <h3
                  className="font-semibold text-[var(--fg-default)]"
                  style={{
                    fontSize: "var(--text-heading)",
                    lineHeight: "var(--leading-heading)",
                  }}
                >
                  {step.title}
                </h3>
                <p
                  className="mt-2 max-w-md text-[var(--fg-muted)]"
                  style={{
                    fontSize: "var(--text-body)",
                    lineHeight: "var(--leading-body)",
                  }}
                >
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
