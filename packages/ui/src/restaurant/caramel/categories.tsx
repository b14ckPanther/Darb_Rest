"use client";
import React, { useRef } from "react";
import { type ContentLocale, type ContentName, localizedContent } from "@darb-rest/types";
import { ContentText } from "../../menu-preview";

export interface CaramelCategory {
  id: string;
  name_i18n: ContentName;
  description_i18n?: ContentName;
}

export function CaramelCategoryRail({
  sections,
  locale,
  activeId,
  onSelect,
  labels: L,
}: {
  sections: CaramelCategory[];
  locale: ContentLocale;
  activeId: string;
  onSelect: (id: string) => void;
  labels: Record<string, string>;
}) {
  const railRef = useRef<HTMLDivElement>(null);

  if (sections.length === 0) {
    return null;
  }

  function handleSelect(id: string) {
    onSelect(id);
    const target = document.getElementById(`restaurant-section-${id}`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <div className="caramel-category-nav" data-category-nav>
      <nav
        ref={railRef}
        className="caramel-category-rail"
        aria-label={L.sections || "Menu categories"}
      >
        <ul className="caramel-category-list">
          {sections.map((s) => {
            const isActive = activeId === s.id;
            const text = localizedContent(s.name_i18n, locale).text.trim();
            const initial = text.charAt(0);

            return (
              <li key={s.id} className="caramel-category-item">
                <button
                  type="button"
                  className={`caramel-category-btn ${isActive ? "is-active" : ""}`}
                  aria-pressed={isActive}
                  onClick={() => handleSelect(s.id)}
                >
                  <span className="caramel-category-circle-outer">
                    <span className="caramel-category-circle-inner">
                      <span className="caramel-category-initial" aria-hidden="true">
                        {initial}
                      </span>
                    </span>
                  </span>
                  <span className="caramel-category-name">
                    <ContentText value={s.name_i18n} locale={locale} />
                  </span>
                  {s.description_i18n && (
                    <span
                      className={`caramel-category-subtitle ${isActive ? "is-active" : ""}`}
                    >
                      <ContentText value={s.description_i18n} locale={locale} />
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
