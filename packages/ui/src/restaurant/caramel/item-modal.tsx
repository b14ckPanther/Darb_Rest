"use client";
import React, { useEffect, useId } from "react";
import {
  type ContentLocale,
  formatMenuPrice,
  localizedContent,
} from "@darb-rest/types";
import { ContentText } from "../../menu-preview";
import { RestaurantImage } from "../image";
import type { CaramelItem } from "./item-card";

export function CaramelItemModal({
  item,
  locale,
  images,
  labels: L,
  position,
  total,
  onClose,
  onPrevious,
  onNext,
  onConfigure,
  addLabel,
}: {
  item: CaramelItem;
  locale: ContentLocale;
  images: Record<string, string>;
  labels: Record<string, string>;
  position: number;
  total: number;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onConfigure?: (id: string) => void;
  addLabel?: string;
}) {
  const titleId = useId();
  const imageSrc = item.image_path ? images[item.image_path] : null;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        if (locale === "en") onNext?.();
        else onPrevious?.();
      } else if (e.key === "ArrowRight") {
        if (locale === "en") onPrevious?.();
        else onNext?.();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose, onPrevious, onNext, locale]);

  return (
    <div
      className="rt-caramel-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="rt-caramel-modal-shell">
        <div className="rt-caramel-modal-handle" aria-hidden="true" />
        <div className="rt-caramel-modal-media">
          {imageSrc ? (
            <RestaurantImage
              key={imageSrc}
              src={imageSrc}
              alt={localizedContent(item.name_i18n, locale).text}
              fetchPriority="high"
              width={600}
              height={450}
            />
          ) : null}
          <button
            type="button"
            className="rt-caramel-modal-close"
            onClick={onClose}
            aria-label={L.close || "Close"}
          >
            ✕
          </button>
        </div>

        <div className="rt-caramel-modal-content">
          <div className="rt-caramel-modal-header">
            {item.dietary.length > 0 && (
              <p className="caramel-eyebrow">
                {item.dietary.map((d) => L[d.code] || d.code).join(" · ")}
              </p>
            )}
            <h2 id={titleId}>
              <ContentText value={item.name_i18n} locale={locale} />
            </h2>
            {item.description_i18n && (
              <p className="rt-caramel-modal-desc">
                <ContentText value={item.description_i18n} locale={locale} />
              </p>
            )}
          </div>

          <div className="rt-caramel-modal-price-row">
            <p className="rt-caramel-modal-price">
              {item.variants.length > 0 && <small>{L.from || "From"} </small>}
              <bdi>{formatMenuPrice(item.price, item.currency, locale)}</bdi>
            </p>
            {!item.is_available && (
              <span className="caramel-badge-status is-closed">
                {L.soldOut || "Unavailable"}
              </span>
            )}
          </div>

          {item.allergens.length > 0 && (
            <p className="caramel-card-desc">
              <strong>{L.allergens || "Allergens"}:</strong>{" "}
              {item.allergens.map((a) => L[a.code] || a.code).join(", ")}
            </p>
          )}

          {item.is_available && onConfigure && (
            <button
              type="button"
              className="rt-caramel-modal-order-btn"
              onClick={() => {
                onClose();
                onConfigure(item.id);
              }}
            >
              {addLabel || L.add || "Add"} ·{" "}
              <bdi>{formatMenuPrice(item.price, item.currency, locale)}</bdi>
            </button>
          )}

          <nav className="rt-caramel-modal-nav" aria-label="Browse dishes">
            <button
              type="button"
              onClick={onPrevious}
              disabled={!onPrevious}
              aria-label={L.previousDish || "Previous dish"}
            >
              {locale === "en" ? "← " : "→ "}
              {L.previousDish || "Previous"}
            </button>
            <span className="rt-caramel-modal-pos">
              {position} / {total}
            </span>
            <button
              type="button"
              onClick={onNext}
              disabled={!onNext}
              aria-label={L.nextDish || "Next dish"}
            >
              {L.nextDish || "Next"}
              {locale === "en" ? " →" : " ←"}
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
