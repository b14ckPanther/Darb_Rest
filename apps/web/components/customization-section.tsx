import React from "react";
import { getDictionary, type SupportedLocale } from "@darb-rest/i18n";
import { IconCheck } from "@darb-rest/icons";

export function CustomizationSection({ locale }: { locale: SupportedLocale }) {
  const dict = getDictionary(locale);

  const points = [
    dict.web.customizePoint1,
    dict.web.customizePoint2,
    dict.web.customizePoint3,
    dict.web.customizePoint4,
  ];

  return (
    <section
      id="restaurants"
      className="relative bg-[var(--darb-green-deep)] text-white"
      style={{ paddingBlock: "var(--section-py)" }}
    >
      <div className="mx-auto px-5 sm:px-8" style={{ maxWidth: "var(--content-max)" }}>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Text Column */}
          <div className="reveal">
            <h2
              className="font-bold"
              style={{
                fontSize: "var(--text-display)",
                lineHeight: "var(--leading-display)",
                letterSpacing: "var(--tracking-tight)",
              }}
            >
              {dict.web.customizeTitle}
            </h2>
            <p
              className="mt-5 max-w-lg text-white/70"
              style={{
                fontSize: "var(--text-body-lg)",
                lineHeight: "var(--leading-body)",
              }}
            >
              {dict.web.customizeDesc}
            </p>

            {/* Feature Points */}
            <ul className="mt-8 space-y-4" role="list">
              {points.map((point, i) => (
                <li key={i} className={`reveal reveal-delay-${i + 1} flex items-start gap-3`}>
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--color-primary-fg)]">
                    <IconCheck size={14} />
                  </span>
                  <span
                    className="text-white/90 font-medium"
                    style={{ fontSize: "var(--text-body-lg)" }}
                  >
                    {point}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Visual Column — Abstract product frame */}
          <div className="reveal reveal-delay-2">
            <div className="relative overflow-hidden rounded-[var(--radius-xl)] bg-[var(--darb-green-mid)] p-1">
              <div className="rounded-[calc(var(--radius-xl)-4px)] bg-[var(--darb-green-dark)]/50 p-6 sm:p-8">
                {/* Abstract UI Frame */}
                <div className="space-y-4">
                  {/* Brand bar mockup */}
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-[var(--radius-md)] bg-[var(--color-primary)]/30" />
                    <div className="space-y-1.5">
                      <div className="h-3 w-28 rounded-full bg-white/20" />
                      <div className="h-2 w-20 rounded-full bg-white/10" />
                    </div>
                  </div>

                  <div className="h-px bg-white/10" />

                  {/* Menu categories mockup */}
                  <div className="flex gap-2">
                    <div className="rounded-full bg-[var(--color-primary)]/25 px-4 py-1.5">
                      <div className="h-2.5 w-12 rounded-full bg-[var(--color-primary)]" />
                    </div>
                    <div className="rounded-full bg-white/5 px-4 py-1.5">
                      <div className="h-2.5 w-16 rounded-full bg-white/15" />
                    </div>
                    <div className="hidden rounded-full bg-white/5 px-4 py-1.5 sm:block">
                      <div className="h-2.5 w-10 rounded-full bg-white/15" />
                    </div>
                  </div>

                  {/* Menu items mockup */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[1, 2, 3, 4].map((n) => (
                      <div key={n} className="flex gap-3 rounded-[var(--radius-md)] bg-white/5 p-3">
                        <div className="h-14 w-14 shrink-0 rounded-[var(--radius-sm)] bg-white/10" />
                        <div className="flex-1 space-y-1.5 pt-1">
                          <div className="h-2.5 w-3/4 rounded-full bg-white/20" />
                          <div className="h-2 w-1/2 rounded-full bg-white/10" />
                          <div className="h-2.5 w-10 rounded-full bg-[var(--color-primary)]/40" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
