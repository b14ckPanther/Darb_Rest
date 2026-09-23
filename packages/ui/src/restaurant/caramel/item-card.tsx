"use client";
import React from "react";
import {
  type ContentLocale,
  formatMenuPrice,
  localizedContent,
  type RestaurantMenuModel,
} from "@darb-rest/types";
import { ContentText } from "../../menu-preview";
import { RestaurantImage } from "../image";

export type CaramelItem = RestaurantMenuModel["sections"][number]["items"][number];

export function CaramelItemCard({
  item,
  locale,
  images,
  labels: L,
  showImages = true,
  onSelect,
  onConfigure,
  addLabel,
}: {
  item: CaramelItem;
  locale: ContentLocale;
  images: Record<string, string>;
  labels: Record<string, string>;
  showImages?: boolean;
  onSelect: () => void;
  onConfigure?: (id: string) => void;
  addLabel?: string;
}) {
  const imageSrc = item.image_path ? images[item.image_path] : null;
  const isAvailable = item.is_available;

  return (
    <article
      className="caramel-menu-card"
      tabIndex={0}
      role="button"
      aria-haspopup="dialog"
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {showImages && (
        <div className="caramel-card-img-wrap" aria-hidden="true">
          {imageSrc ? (
            <RestaurantImage
              key={imageSrc}
              src={imageSrc}
              alt={localizedContent(item.name_i18n, locale).text}
              loading="lazy"
              width={400}
              height={300}
            />
          ) : null}
          {!isAvailable && (
            <span className="caramel-card-unavailable">
              {L.soldOut || "Unavailable"}
            </span>
          )}
        </div>
      )}

      <div className="caramel-card-body">
        <h3 className="caramel-card-name">
          <ContentText value={item.name_i18n} locale={locale} />
        </h3>

        <p className="caramel-card-price">
          {item.variants.length > 0 && <small>{L.from || "From"} </small>}
          <bdi>{formatMenuPrice(item.price, item.currency, locale)}</bdi>
        </p>

        {item.description_i18n && (
          <p className="caramel-card-desc">
            <ContentText value={item.description_i18n} locale={locale} />
          </p>
        )}

        {isAvailable && onConfigure && (
          <button
            type="button"
            className="caramel-card-add-btn"
            onClick={(e) => {
              e.stopPropagation();
              onConfigure(item.id);
            }}
          >
            {addLabel || L.add || "+"}
          </button>
        )}
      </div>
    </article>
  );
}
