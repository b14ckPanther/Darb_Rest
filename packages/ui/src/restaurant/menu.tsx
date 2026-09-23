"use client";
import React, { useEffect, useState } from "react";
import {
  restaurantMenuModel,
  resolvedLayout,
  brandingUrl,
  safePublicUrl,
  restaurantOpen,
  formatMenuPrice,
  localizedContent,
  resolveSemanticTheme,
  semanticThemeToCssVars,
  type AppearanceSettings,
  type RestaurantProfile,
} from "@darb-rest/types";
import { ContentText, type MenuPreviewProps } from "../menu-preview";
import { RestaurantImage } from "./image";
import { restaurantTemplate } from "./registry";
import { CaramelMenu } from "./caramel";
import { RestaurantUtilityBar } from "./utility-bar";
import type { ContentName } from "@darb-rest/types";

export interface RestaurantPresentation {
  previewMedia?: boolean;
  settings: AppearanceSettings;
  profile: RestaurantProfile;
  labels: Record<string, string>;
  branches?: { id: string; slug: string; name: ContentName }[];
  currentBranchSlug?: string;
  businessSlug?: string;
  confirmBranchLabel?: string;
}
export function RestaurantMenu({
  restaurant,
  ...p
}: MenuPreviewProps & { restaurant: RestaurantPresentation }) {
  const { settings, profile, labels: L } = restaurant;
  const layout = resolvedLayout(settings);
  const template = restaurantTemplate(settings.template);
  if (template.id === "caramel") {
    return <CaramelMenu restaurant={restaurant} {...p} />;
  }
  const [selected, setSelected] = useState("");
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  const model = restaurantMenuModel(p.data, p.branchId ?? p.locations[0]?.id ?? "", selected);
  const sections = model.sections.filter((section) => section.items.length > 0);
  const opened = now ? restaurantOpen(profile, now) : null;
  const resolvedTheme = resolveSemanticTheme(template.id, settings);
  const style = {
    ...semanticThemeToCssVars(resolvedTheme),
  } as React.CSSProperties;
  const information = (
    <div className="rt-info">
      <div className="rt-info-summary">
        <span className="rt-status">
          {opened === null ? L.hoursUnknown : opened ? L.open : L.closed}
        </span>
        <span>{profile.address}</span>
        {profile.phone && (
          <a href={`tel:${profile.phone.replace(/[^+0-9]/g, "")}`}>{profile.phone}</a>
        )}
      </div>
      <details>
        <summary>{L.visit}</summary>
        <div className="rt-visit">
          <div>
            <h2>{L.hours}</h2>
            {[1, 2, 3, 4, 5, 6, 7].map((day) => (
              <p key={day}>
                <span>
                  {new Intl.DateTimeFormat(p.locale, { weekday: "long", timeZone: "UTC" }).format(
                    new Date(Date.UTC(2024, 0, day)),
                  )}
                </span>
                <bdi>
                  {profile.hours
                    .filter((h) => h.day_of_week === day && !h.is_closed)
                    .map((h) => `${h.open_time.slice(0, 5)}–${h.close_time.slice(0, 5)}`)
                    .join(" / ") ||
                    (profile.hours.some((h) => h.day_of_week === day) ? L.closed : L.hoursUnknown)}
                </bdi>
              </p>
            ))}
            <small>{profile.timezone}</small>
          </div>
          <div>
            <h2>{L.location}</h2>
            <p>{profile.address}</p>
            {profile.address && (
              <a
                target="_blank"
                rel="noreferrer"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(profile.address)}`}
              >
                {L.directions}
              </a>
            )}
            <div className="rt-socials">
              {(["website", "instagram", "facebook"] as const).map(
                (key) =>
                  safePublicUrl(profile[key]) && (
                    <a
                      key={key}
                      href={safePublicUrl(profile[key])}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {L[key]}
                    </a>
                  ),
              )}
            </div>
          </div>
        </div>
      </details>
    </div>
  );
  return (
    <div
      className={`restaurant-template ${template.className}`}
      data-template={template.id}
      data-density={settings.density}
      data-hero={layout.hero}
      data-focal={layout.focal}
      data-navigation={layout.navigation}
      data-cards={layout.cards}
      data-information={layout.information}
      data-cta={layout.cta}
      data-footer={layout.footer}
      data-surface={layout.surface}
      style={style}
    >
      <RestaurantUtilityBar
        locale={p.locale}
        showLanguageSwitcher={settings.showLanguageSwitcher !== false}
        branches={restaurant.branches}
        currentBranchSlug={restaurant.currentBranchSlug}
        businessSlug={restaurant.businessSlug}
        branchLabel={L.branch ?? "Branch"}
        confirmBranchLabel={restaurant.confirmBranchLabel}
        languageLabel={L.language ?? "Language"}
        variant="default"
      />
      <template.Hero
        name={p.business.name}
        locale={p.locale}
        settings={settings}
        previewMedia={restaurant.previewMedia}
        label={L.restaurant ?? ""}
      />
      <p role="status" className="border-b p-4 text-sm font-medium" data-ordering-hours>
        {opened === false ? L.closedOrdering : opened === true ? L.openOrdering : L.unknownOrdering}
      </p>
      {layout.information === "before" && information}
      {safePublicUrl(settings.coverVideo) && (
        <details className="rt-film">
          <summary>{L.film}</summary>
          <video
            controls
            preload="none"
            playsInline
            poster={brandingUrl(settings.cover, restaurant.previewMedia)}
            src={safePublicUrl(settings.coverVideo)}
            aria-label={L.film}
          />
        </details>
      )}
      <div className="rt-menu-switch" role="group" aria-label={p.labels.title}>
        {model.menus.map((m) => (
          <button
            key={m.id}
            aria-pressed={model.menu?.id === m.id}
            onClick={() => setSelected(m.id)}
          >
            <ContentText value={m.name_i18n} locale={p.locale} />
          </button>
        ))}
      </div>
      <div className="rt-menu-shell" id="restaurant-menu">
        <nav className="rt-categories" aria-label={p.labels.sections}>
          {sections.map((s, n) => (
            <a href={`#restaurant-section-${s.id}`} key={s.id}>
              <span className="rt-category-number" aria-hidden="true">
                {String(n + 1).padStart(2, "0")}
              </span>
              <ContentText value={s.name_i18n} locale={p.locale} />
            </a>
          ))}
        </nav>
        <div className="rt-sections">
          {!sections.length && <p className="rt-empty">{p.labels.noPreview}</p>}
          {sections.map((section, n) => (
            <section
              className="rt-section"
              key={section.id}
              id={`restaurant-section-${section.id}`}
            >
              <header className="rt-section-title">
                <span aria-hidden="true">{String(n + 1).padStart(2, "0")}</span>
                <div>
                  <h2>
                    <ContentText value={section.name_i18n} locale={p.locale} />
                  </h2>
                  <p>
                    <ContentText value={section.description_i18n} locale={p.locale} />
                  </p>
                </div>
              </header>
              <div className="rt-items">
                {section.items.map((item) => (
                  <article className="rt-item" key={item.id} data-available={item.is_available}>
                    {settings.images && (
                      <div className="rt-item-image">
                        {item.image_path && p.images[item.image_path] ? (
                          <RestaurantImage
                            key={p.images[item.image_path]}
                            src={p.images[item.image_path]}
                            alt={localizedContent(item.name_i18n, p.locale).text}
                            loading="lazy"
                            width={600}
                            height={450}
                          />
                        ) : (
                          <div className="rt-image-placeholder" aria-hidden="true" />
                        )}
                      </div>
                    )}
                    <div className="rt-item-body">
                      <h3>
                        <ContentText value={item.name_i18n} locale={p.locale} />
                      </h3>
                      <p className="rt-description">
                        <ContentText value={item.description_i18n} locale={p.locale} />
                      </p>
                      <div className="rt-price">
                        {!!item.variants.length && <small>{p.labels.from}</small>}{" "}
                        <bdi>{formatMenuPrice(item.price, item.currency, p.locale)}</bdi>
                      </div>
                      <div className="rt-tags">
                        {item.dietary.map((t) => (
                          <span key={t.id}>{p.labels[t.code]}</span>
                        ))}
                      </div>
                      {!item.is_available ? (
                        <p>{p.labels.soldOut}</p>
                      ) : (
                        p.onConfigure && (
                          <button className="rt-add" onClick={() => p.onConfigure?.(item.id)}>
                            {p.addLabel}
                          </button>
                        )
                      )}
                      <details className="rt-item-details">
                        <summary>{p.labels.details}</summary>
                        {item.variants.map((v) => (
                          <p key={v.id}>
                            <ContentText value={v.name_i18n} locale={p.locale} />
                            <bdi>{formatMenuPrice(v.price, item.currency, p.locale)}</bdi>
                          </p>
                        ))}
                        {item.groups.map((g) => (
                          <div key={g.id}>
                            <h4>
                              <ContentText value={g.name_i18n} locale={p.locale} /> ({g.min_select}–
                              {g.max_select})
                            </h4>
                            {g.options.map((o) => (
                              <p key={o.id}>
                                <ContentText value={o.name_i18n} locale={p.locale} />
                                <bdi>
                                  +{formatMenuPrice(o.price_delta, item.currency, p.locale)}
                                </bdi>
                              </p>
                            ))}
                          </div>
                        ))}
                        <p>
                          {p.labels.allergens}:{" "}
                          {item.allergens.map((a) => p.labels[a.code]).join(" · ") || "—"}
                        </p>
                      </details>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
      {layout.information === "after" && information}
      <footer className="rt-footer">
        {layout.footer === "contact" && (
          <div className="rt-footer-contact">
            <h2>
              <ContentText value={p.business.name} locale={p.locale} />
            </h2>
            <p>{profile.address}</p>
            {profile.phone && (
              <a href={`tel:${profile.phone.replace(/[^+0-9]/g, "")}`}>{profile.phone}</a>
            )}
            <a href="#restaurant-menu">{p.labels.title}</a>
          </div>
        )}
        <p>{p.labels.disclaimer}</p>
      </footer>
    </div>
  );
}
