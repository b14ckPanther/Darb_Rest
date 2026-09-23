"use client";
import React, { useRef } from "react";
import { type ContentLocale, type RestaurantMenuModel } from "@darb-rest/types";
import { ContentText } from "../../menu-preview";
import { CaramelItemCard, type CaramelItem } from "./item-card";

type SectionType = RestaurantMenuModel["sections"][number];

export function CaramelMenuSection({
  section,
  index,
  locale,
  images,
  labels: L,
  showImages,
  onSelectItem,
  onConfigure,
  addLabel,
}: {
  section: SectionType;
  index: number;
  locale: ContentLocale;
  images: Record<string, string>;
  labels: Record<string, string>;
  showImages?: boolean;
  onSelectItem: (item: CaramelItem, sectionItems: CaramelItem[], itemIndex: number) => void;
  onConfigure?: (id: string) => void;
  addLabel?: string;
}) {
  const railRef = useRef<HTMLUListElement>(null);
  const isAlt = index % 2 === 1;

  function move(direction: 1 | -1) {
    const rail = railRef.current;
    if (!rail) return;
    const isRtl = locale === "ar" || locale === "he";
    const delta = direction * rail.clientWidth * 0.75 * (isRtl ? -1 : 1);
    rail.scrollBy({
      left: delta,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  }

  return (
    <section
      id={`restaurant-section-${section.id}`}
      className="caramel-section-wrap"
      aria-labelledby={`category-title-${section.id}`}
    >
      <div className={`caramel-category-board ${isAlt ? "is-alt" : ""}`}>
        <header className="caramel-section-header">
          <div>
            <div className="caramel-section-title-wrap">
              <h2 id={`category-title-${section.id}`}>
                <ContentText value={section.name_i18n} locale={locale} />
              </h2>
              <span className="caramel-section-count">{section.items.length}</span>
            </div>
            {section.description_i18n && (
              <p className="caramel-section-desc">
                <ContentText value={section.description_i18n} locale={locale} />
              </p>
            )}
          </div>

          {section.items.length > 0 && (
            <div className="caramel-rail-controls">
              <span className="caramel-rail-hint">
                {L.scrollAndDiscover || "Scroll & discover"}
              </span>
              <button
                type="button"
                className="caramel-rail-arrow"
                onClick={() => move(-1)}
                aria-label={L.previousDish || "Previous"}
              >
                {locale === "en" ? "←" : "→"}
              </button>
              <button
                type="button"
                className="caramel-rail-arrow"
                onClick={() => move(1)}
                aria-label={L.nextDish || "Next"}
              >
                {locale === "en" ? "→" : "←"}
              </button>
            </div>
          )}
        </header>

        {section.items.length > 0 ? (
          <ul
            ref={railRef}
            className="caramel-dish-rail"
            tabIndex={0}
            aria-label={L.sections || "Dishes"}
          >
            {section.items.map((item, itemIdx) => (
              <li key={item.id} className="caramel-dish-card-item">
                <CaramelItemCard
                  item={item}
                  locale={locale}
                  images={images}
                  labels={L}
                  showImages={showImages}
                  onSelect={() => onSelectItem(item, section.items, itemIdx)}
                  onConfigure={onConfigure}
                  addLabel={addLabel}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="caramel-card-desc" style={{ padding: "1rem" }}>
            {L.noItems || "No items in this section."}
          </p>
        )}
      </div>
    </section>
  );
}
