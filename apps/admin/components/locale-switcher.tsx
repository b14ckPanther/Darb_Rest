"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { LOCALE_CONFIGS, SUPPORTED_LOCALES, type SupportedLocale } from "@darb-rest/i18n";
import { COOKIE_KEYS } from "@darb-rest/config";
import { IconGlobe } from "@darb-rest/icons";

export function LocaleSwitcher({ currentLocale }: { currentLocale: SupportedLocale }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLocaleChange = (newLocale: SupportedLocale) => {
    document.cookie = `${COOKIE_KEYS.LOCALE}=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;

    const segments = pathname.split("/").filter(Boolean);
    if (segments.length > 0 && (SUPPORTED_LOCALES as readonly string[]).includes(segments[0]!)) {
      segments[0] = newLocale;
    } else {
      segments.unshift(newLocale);
    }
    const newPath = `/${segments.join("/")}`;
    router.push(newPath);
  };

  return (
    <div className="inline-flex items-center gap-1 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-surface)] p-1 shadow-xs">
      <div className="flex items-center ps-1.5 pe-1 text-[var(--fg-muted)]">
        <IconGlobe size={14} />
      </div>
      <div className="flex items-center gap-0.5">
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
              className={`px-2 py-0.5 text-xs font-semibold rounded-[var(--radius-sm)] transition-all cursor-pointer ${
                isActive
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-fg)] shadow-xs"
                  : "text-[var(--fg-muted)] hover:text-[var(--fg-default)] hover:bg-[var(--bg-surface-elevated)]"
              }`}
            >
              {config.nativeName}
            </button>
          );
        })}
      </div>
    </div>
  );
}
