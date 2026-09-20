"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { ContentText } from "@darb-rest/ui";
import type { ContentName, ContentLocale } from "@darb-rest/types";
export function RestaurantBranches({
  branches,
  business,
  locale,
  current,
  label,
  confirmLabel,
}: {
  branches: { id: string; slug: string; name: ContentName }[];
  business: string;
  locale: ContentLocale;
  current: string;
  label: string;
  confirmLabel: string;
}) {
  const path = usePathname();
  const query = useSearchParams();
  return (
    <nav aria-label={label} className="mx-auto flex max-w-6xl flex-wrap gap-2 px-4 py-3">
      {branches.map((b) => (
        <a
          key={b.id}
          href={
            b.slug === current
              ? `${path}?${query.toString()}`
              : `/${locale}/${business}?branch=${b.slug}`
          }
          aria-current={b.slug === current ? "page" : undefined}
          onClick={(e) => {
            if (b.slug === current) e.preventDefault();
            else if (!window.confirm(confirmLabel)) e.preventDefault();
          }}
          className="inline-flex min-h-11 items-center rounded-full border bg-white px-4 text-sm aria-[current=page]:bg-[#1a3c2a] aria-[current=page]:text-white"
        >
          <ContentText value={b.name} locale={locale} />
        </a>
      ))}
    </nav>
  );
}
