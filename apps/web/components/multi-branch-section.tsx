import React from "react";
import { getDictionary, type SupportedLocale } from "@darb-rest/i18n";
import { IconMapPin, IconClock } from "@darb-rest/icons";

export function MultiBranchSection({ locale }: { locale: SupportedLocale }) {
  const dict = getDictionary(locale);

  const points = [
    { icon: <IconMapPin size={18} />, text: dict.web.branchPoint1 },
    { icon: <IconClock size={18} />, text: dict.web.branchPoint2 },
    { icon: <IconStore size={18} />, text: dict.web.branchPoint3 },
  ];

  return (
    <section
      className="relative bg-[var(--warm-bone)]"
      style={{ paddingBlock: "var(--section-py)" }}
    >
      <div className="mx-auto px-5 sm:px-8" style={{ maxWidth: "var(--content-max)" }}>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Visual Column — Abstract branch visualization */}
          <div className="reveal order-2 lg:order-1">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {["A", "B", "C", "D"].map((branch, i) => (
                <div
                  key={branch}
                  className={`reveal reveal-delay-${i + 1} rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-surface)] p-4 transition-all hover:shadow-[var(--shadow-md)] sm:p-5`}
                  style={{ transitionDuration: "var(--motion-medium)" }}
                >
                  <div className="mb-3 flex items-center gap-2">
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${i === 0 ? "bg-[var(--color-primary)]" : "bg-[var(--color-success)]"}`}
                    />
                    <div className="h-2 w-16 rounded-full bg-[var(--fg-default)]/15" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-2 w-full rounded-full bg-[var(--fg-default)]/8" />
                    <div className="h-2 w-3/4 rounded-full bg-[var(--fg-default)]/8" />
                    <div className="flex items-center gap-1.5 pt-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]/40" />
                      <div className="h-1.5 w-12 rounded-full bg-[var(--fg-default)]/8" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Text Column */}
          <div className="reveal order-1 lg:order-2">
            <h2
              className="font-bold text-[var(--fg-default)]"
              style={{
                fontSize: "var(--text-display)",
                lineHeight: "var(--leading-display)",
                letterSpacing: "var(--tracking-tight)",
              }}
            >
              {dict.web.branchTitle}
            </h2>
            <p
              className="mt-5 max-w-lg text-[var(--fg-muted)]"
              style={{
                fontSize: "var(--text-body-lg)",
                lineHeight: "var(--leading-body)",
              }}
            >
              {dict.web.branchDesc}
            </p>

            {/* Feature Points */}
            <div className="mt-8 space-y-4">
              {points.map((point, i) => (
                <div key={i} className={`reveal reveal-delay-${i + 1} flex items-center gap-3`}>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--darb-green-deep)] text-white">
                    {point.icon}
                  </span>
                  <span
                    className="font-medium text-[var(--fg-default)]"
                    style={{ fontSize: "var(--text-body)" }}
                  >
                    {point.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Re-export icon used inline
function IconStore({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
      <path d="M2 7h20" />
      <path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7" />
    </svg>
  );
}
