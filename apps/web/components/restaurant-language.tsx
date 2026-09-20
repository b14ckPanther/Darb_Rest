"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { LOCALE_CONFIGS } from "@darb-rest/i18n";
import { restaurantLocaleUrl } from "@darb-rest/types";
export function RestaurantLanguage({ label, locale }: { label: string; locale: string }) {
  const path = usePathname(),
    query = useSearchParams();
  return (
    <nav className="mx-auto mb-5 flex max-w-6xl justify-end gap-2" aria-label={label}>
      {(["ar", "he", "en"] as const).map((l) => (
        <a
          key={l}
          lang={l}
          href={restaurantLocaleUrl(`${path}?${query.toString()}`, l)}
          aria-current={l === locale ? "page" : undefined}
          onClick={(e) => {
            e.currentTarget.href = restaurantLocaleUrl(
              location.pathname + location.search + location.hash,
              l,
            );
          }}
          className="inline-flex min-h-11 items-center rounded-full border bg-white px-4 text-sm"
        >
          {LOCALE_CONFIGS[l].nativeName}
        </a>
      ))}
    </nav>
  );
}
