"use client";

import React, { useLayoutEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LOCALE_CONFIGS, SUPPORTED_LOCALES, type SupportedLocale } from "@darb-rest/i18n";
import { COOKIE_KEYS } from "@darb-rest/config";
import { IconGlobe } from "@darb-rest/icons";

// A locale segment can remount the header/footer. Keep the one-shot scroll target
// outside either switcher instance, and consume it only on the destination route.
let pendingScroll: { pathname: string; section: number; offset: number; y: number } | undefined;
const scrollSections = () => Array.from(document.querySelectorAll("main section, footer"));

export function LocaleSwitcher({
  currentLocale,
  variant = "default",
}: {
  currentLocale: SupportedLocale;
  variant?: "default" | "compact" | "footer";
}) {
  const pathname = usePathname();
  const router = useRouter();

  useLayoutEffect(() => {
    const target = pendingScroll;
    if (!target) return;
    pendingScroll = undefined;
    if (target.pathname !== pathname) return;
    const section = scrollSections()[target.section];
    // Restore before paint without animating through the translated document.
    window.scrollTo({
      top: section
        ? window.scrollY + section.getBoundingClientRect().top - target.offset
        : target.y,
      behavior: "instant",
    });
  }, [pathname]);

  const handleLocaleChange = (newLocale: SupportedLocale) => {
    if (newLocale === currentLocale) return;

    // Set cookie for persistence
    document.cookie = `${COOKIE_KEYS.LOCALE}=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;

    // Replace locale in path
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length > 0 && (SUPPORTED_LOCALES as readonly string[]).includes(segments[0]!)) {
      segments[0] = newLocale;
    } else {
      segments.unshift(newLocale);
    }
    const newPath = `/${segments.join("/")}`;
    // On the homepage preserve the visible section, not just its old pixel
    // position: translated text and fonts change the height of preceding sections.
    const sections = segments.length === 1 ? scrollSections() : [];
    const section = sections.findIndex((element) => element.getBoundingClientRect().bottom > 100);
    pendingScroll = {
      pathname: newPath,
      section,
      offset: sections[section]?.getBoundingClientRect().top ?? 0,
      y: window.scrollY,
    };
    router.push(`${newPath}${window.location.search}${window.location.hash}`, { scroll: false });
  };

  if (variant === "footer") {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--graphite-light)] bg-[var(--graphite)] p-1">
        <div className="flex items-center ps-1.5 pe-1 text-[var(--fg-subtle)]">
          <IconGlobe size={14} />
        </div>
        <div className="flex items-center gap-1">
          {SUPPORTED_LOCALES.map((localeCode) => {
            const config = LOCALE_CONFIGS[localeCode];
            const isActive = currentLocale === localeCode;

            return (
              <button
                key={localeCode}
                lang={localeCode}
                dir={localeCode === "en" ? "ltr" : "rtl"}
                type="button"
                onClick={() => handleLocaleChange(localeCode)}
                aria-current={isActive ? "true" : undefined}
                aria-label={`Switch language to ${config.name}`}
                className={`px-2.5 py-1 text-xs font-semibold rounded-[var(--radius-sm)] transition-all cursor-pointer ${
                  isActive
                    ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)]"
                    : "text-[var(--fg-subtle)] hover:text-[var(--fg-inverted)] hover:bg-[var(--graphite-light)]"
                }`}
                style={{ transitionDuration: "var(--motion-fast)" }}
              >
                {config.nativeName}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className="inline-flex items-center gap-0.5 rounded-[var(--radius-sm)] p-0.5">
        {SUPPORTED_LOCALES.map((localeCode) => {
          const config = LOCALE_CONFIGS[localeCode];
          const isActive = currentLocale === localeCode;

          return (
            <button
              key={localeCode}
              lang="en"
              dir="ltr"
              type="button"
              onClick={() => handleLocaleChange(localeCode)}
              aria-current={isActive ? "true" : undefined}
              aria-label={`Switch language to ${config.name}`}
              className={`min-h-11 min-w-11 px-2 py-1 text-xs font-semibold rounded-[var(--radius-xs)] transition-all cursor-pointer ${
                isActive
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)]"
                  : "text-[var(--fg-muted)] hover:text-[var(--fg-default)]"
              }`}
              style={{ transitionDuration: "var(--motion-fast)" }}
            >
              {config.code.toUpperCase()}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-surface)] p-1 shadow-xs">
      <div className="flex items-center ps-1.5 pe-1 text-[var(--fg-muted)]">
        <IconGlobe size={15} />
      </div>
      <div className="flex items-center gap-1">
        {SUPPORTED_LOCALES.map((localeCode) => {
          const config = LOCALE_CONFIGS[localeCode];
          const isActive = currentLocale === localeCode;

          return (
            <button
              key={localeCode}
              lang={localeCode}
              dir={localeCode === "en" ? "ltr" : "rtl"}
              type="button"
              onClick={() => handleLocaleChange(localeCode)}
              aria-current={isActive ? "true" : undefined}
              aria-label={`Switch language to ${config.name}`}
              className={`px-2.5 py-1 text-xs font-semibold rounded-[var(--radius-sm)] transition-all cursor-pointer ${
                isActive
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)] shadow-xs"
                  : "text-[var(--fg-muted)] hover:text-[var(--fg-default)] hover:bg-[var(--bg-surface-elevated)]"
              }`}
              style={{ transitionDuration: "var(--motion-fast)" }}
            >
              {config.nativeName}
            </button>
          );
        })}
      </div>
    </div>
  );
}
