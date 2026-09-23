"use client";
import React from "react";
import {
  type AppearanceSettings,
  type ContentLocale,
  type ContentName,
  type RestaurantProfile,
  brandingUrl,
  localizedContent,
  restaurantOpen,
} from "@darb-rest/types";
import { ContentText } from "../../menu-preview";
import { RestaurantImage } from "../image";

function getTodayDayOfWeek(timezone: string, now: Date): number {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone || "UTC",
      weekday: "short",
    }).formatToParts(now);
    const dayName = parts.find((p) => p.type === "weekday")?.value ?? "";
    const idx = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(dayName);
    return idx >= 0 ? idx + 1 : 1;
  } catch {
    return now.getUTCDay() || 7;
  }
}

export function CaramelMark({
  name,
  locale,
  settings,
  previewMedia,
}: {
  name: ContentName;
  locale: ContentLocale;
  settings: AppearanceSettings;
  previewMedia?: boolean;
}) {
  const logo = brandingUrl(settings.logo, previewMedia);
  const localized = localizedContent(name, locale).text.trim();
  const initial = localized.charAt(0);

  return (
    <div className="caramel-mark" aria-hidden="true">
      {logo ? (
        <RestaurantImage
          key={logo}
          src={logo}
          width={112}
          height={112}
          alt=""
          referrerPolicy="no-referrer"
        />
      ) : initial ? (
        <span className="caramel-mark-initial">{initial}</span>
      ) : (
        <span className="caramel-mark-initial">D</span>
      )}
    </div>
  );
}

export function CaramelOpenStatus({
  profile,
  labels: L,
  now,
}: {
  profile: RestaurantProfile;
  labels: Record<string, string>;
  now: Date | null;
}) {
  if (!profile.hours || profile.hours.length === 0) {
    return null;
  }

  const isOpen = now ? restaurantOpen(profile, now) : null;
  const day = now ? getTodayDayOfWeek(profile.timezone, now) : 1;
  const todayEntries = profile.hours.filter((h) => h.day_of_week === day && !h.is_closed);
  const todayHours = todayEntries.length
    ? todayEntries.map((h) => `${h.open_time.slice(0, 5)}–${h.close_time.slice(0, 5)}`).join(" / ")
    : profile.hours.some((h) => h.day_of_week === day)
      ? L.closed
      : null;

  return (
    <div className="caramel-status-row">
      <span
        className={`caramel-badge-status ${isOpen === true ? "is-open" : "is-closed"}`}
        role="status"
        aria-live="polite"
      >
        {isOpen === null ? L.hoursUnknown : isOpen ? L.open : L.closed}
      </span>
      {todayHours && (
        <span className={`caramel-badge-hours ${isOpen === true ? "is-open" : "is-closed"}`}>
          {todayHours}
        </span>
      )}
    </div>
  );
}

export function CaramelIdentity({
  name,
  locale,
  settings,
  profile,
  labels: L,
  now,
  previewMedia,
}: {
  name: ContentName;
  locale: ContentLocale;
  settings: AppearanceSettings;
  profile: RestaurantProfile;
  labels: Record<string, string>;
  now: Date | null;
  previewMedia?: boolean;
}) {
  const address = profile.address?.trim();
  const mapsUrl = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : "";

  return (
    <div className="caramel-identity-wrap">
      <div className="caramel-identity-seam">
        <CaramelMark
          name={name}
          locale={locale}
          settings={settings}
          previewMedia={previewMedia}
        />
        <CaramelOpenStatus profile={profile} labels={L} now={now} />
      </div>

      <div className="caramel-identity-copy">
        <h1>
          <ContentText value={name} locale={locale} />
        </h1>
        {address && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="caramel-address-link"
            aria-label={`${L.directions || "Directions"}: ${address}`}
          >
            <span>{address}</span>
          </a>
        )}
      </div>
    </div>
  );
}
