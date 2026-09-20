import React from "react";
import { getDictionary, type SupportedLocale } from "@darb-rest/i18n";

export function MenuPreviewSection({ locale }: { locale: SupportedLocale }) {
  const dict = getDictionary(locale);

  return (
    <section
      className="relative bg-[var(--bg-surface)]"
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
            {dict.web.menuTitle}
          </h2>
          <p
            className="mx-auto mt-4 max-w-xl text-[var(--fg-muted)]"
            style={{
              fontSize: "var(--text-body-lg)",
              lineHeight: "var(--leading-body)",
            }}
          >
            {dict.web.menuDesc}
          </p>
        </div>

        {/* Abstract Menu Preview */}
        <div className="reveal mx-auto max-w-4xl">
          <div className="overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-default)] bg-[var(--warm-ivory)] shadow-[var(--shadow-lg)]">
            {/* Menu Header */}
            <div className="border-b border-[var(--border-subtle)] px-6 py-4 sm:px-8 sm:py-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-[var(--color-primary)]/15" />
                  <div className="space-y-1">
                    <div className="h-3 w-24 rounded-full bg-[var(--fg-default)]/15" />
                    <div className="h-2 w-16 rounded-full bg-[var(--fg-default)]/8" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="h-2 w-2 rounded-full bg-[var(--color-success)]" />
                  <div className="h-2 w-14 rounded-full bg-[var(--fg-default)]/10" />
                </div>
              </div>
            </div>

            {/* Category Tabs */}
            <div className="border-b border-[var(--border-subtle)] px-6 py-3 sm:px-8">
              <div className="flex gap-3 overflow-x-auto">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className={`shrink-0 rounded-full px-4 py-1.5 ${
                      n === 1
                        ? "bg-[var(--darb-green-deep)] text-white"
                        : "bg-[var(--bg-surface-elevated)]"
                    }`}
                  >
                    <div
                      className={`h-2.5 rounded-full ${
                        n === 1
                          ? "w-14 bg-white/60"
                          : `${n === 2 ? "w-16" : n === 3 ? "w-12" : "w-10"} bg-[var(--fg-default)]/12`
                      }`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Menu Items Grid */}
            <div className="p-6 sm:p-8">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div
                    key={n}
                    className={`reveal reveal-delay-${Math.min(n, 4)} group overflow-hidden rounded-[var(--radius-lg)] bg-[var(--bg-surface)] border border-[var(--border-subtle)] transition-all hover:shadow-[var(--shadow-md)]`}
                    style={{ transitionDuration: "var(--motion-medium)" }}
                  >
                    {/* Dish image placeholder */}
                    <div className="aspect-[4/3] bg-gradient-to-br from-[var(--warm-bone)] to-[var(--warm-cream)]" />

                    {/* Dish info */}
                    <div className="p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1.5 flex-1">
                          <div className="h-3 w-3/4 rounded-full bg-[var(--fg-default)]/15" />
                          <div className="h-2 w-full rounded-full bg-[var(--fg-default)]/6" />
                        </div>
                        <div className="shrink-0 rounded-[var(--radius-sm)] bg-[var(--color-primary)]/10 px-2 py-0.5">
                          <div className="h-2.5 w-8 rounded-full bg-[var(--color-primary)]/50" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Feature Points */}
        <div className="reveal mt-10 flex flex-wrap justify-center gap-6 sm:gap-10">
          {[dict.web.menuPoint1, dict.web.menuPoint2, dict.web.menuPoint3].map((point, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <div className="h-2 w-2 rounded-full bg-[var(--color-primary)]" />
              <span
                className="font-medium text-[var(--fg-muted)]"
                style={{ fontSize: "var(--text-sm)" }}
              >
                {point}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
