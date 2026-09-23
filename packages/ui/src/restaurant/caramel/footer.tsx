"use client";
import React from "react";
import {
  type AppearanceSettings,
  type ContentLocale,
  type ContentName,
  type RestaurantProfile,
  brandingUrl,
  localizedContent,
  safePublicUrl,
} from "@darb-rest/types";
import { ContentText } from "../../menu-preview";
import { RestaurantImage } from "../image";

export function CaramelFooter({
  name,
  locale,
  settings,
  profile,
  labels: L,
  previewMedia,
}: {
  name: ContentName;
  locale: ContentLocale;
  settings: AppearanceSettings;
  profile: RestaurantProfile;
  labels: Record<string, string>;
  previewMedia?: boolean;
}) {
  const logo = brandingUrl(settings.logo, previewMedia);
  const localized = localizedContent(name, locale).text.trim();
  const initial = localized.charAt(0);
  const phone = profile.phone?.trim();
  const phoneTel = phone ? `tel:${phone.replace(/[^+0-9]/g, "")}` : "";

  return (
    <footer className="caramel-footer">
      <div className="caramel-footer-inner">
        <div className="caramel-footer-brand">
          <div className="caramel-footer-mark" aria-hidden="true">
            {logo ? (
              <RestaurantImage
                key={logo}
                src={logo}
                width={56}
                height={56}
                alt=""
                referrerPolicy="no-referrer"
              />
            ) : initial ? (
              <span className="caramel-footer-initial">
                {initial}
              </span>
            ) : (
              <span className="caramel-footer-dot" />
            )}
          </div>
          <div>
            <p className="caramel-footer-name">
              <ContentText value={name} locale={locale} />
            </p>
          </div>
        </div>

        <div className="caramel-footer-links">
          {phone && (
            <a href={phoneTel} aria-label={phone}>
              {phone}
            </a>
          )}
          {safePublicUrl(profile.website) && (
            <a href={safePublicUrl(profile.website)} target="_blank" rel="noopener noreferrer">
              {L.website || "Website"}
            </a>
          )}
          {safePublicUrl(profile.instagram) && (
            <a href={safePublicUrl(profile.instagram)} target="_blank" rel="noopener noreferrer">
              {L.instagram || "Instagram"}
            </a>
          )}
          {safePublicUrl(profile.facebook) && (
            <a href={safePublicUrl(profile.facebook)} target="_blank" rel="noopener noreferrer">
              {L.facebook || "Facebook"}
            </a>
          )}
        </div>
      </div>

      {L.disclaimer && (
        <p className="caramel-disclaimer">{L.disclaimer}</p>
      )}
    </footer>
  );
}
