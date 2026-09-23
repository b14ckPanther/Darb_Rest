"use client";
import React from "react";
import { type ContentLocale, type RestaurantProfile } from "@darb-rest/types";

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

export function CaramelAboutSection({
  story,
  labels: L,
}: {
  story?: string | null;
  labels: Record<string, string>;
}) {
  if (!story || !story.trim()) {
    return null;
  }

  return (
    <section className="caramel-story-section" aria-label={L.story || "Our story"}>
      <p className="caramel-eyebrow">{L.story || "Our story"}</p>
      <p>{story.trim()}</p>
    </section>
  );
}

export function CaramelVenueSection({
  profile,
  locale,
  labels: L,
  now,
}: {
  profile: RestaurantProfile;
  locale: ContentLocale;
  labels: Record<string, string>;
  now: Date | null;
}) {
  const address = profile.address?.trim();
  const hasHours = profile.hours && profile.hours.length > 0;
  if (!address && !hasHours) {
    return null;
  }

  const todayDay = now ? getTodayDayOfWeek(profile.timezone, now) : 1;
  const mapsUrl = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : "";
  const wazeUrl = address
    ? `https://waze.com/ul?q=${encodeURIComponent(address)}`
    : "";

  return (
    <section className="caramel-venue-section" aria-label={L.visit || "Plan your visit"}>
      {address && (
        <div className="caramel-venue-block">
          <h2>{L.location || "Location"}</h2>
          <p className="caramel-location-address">
            {address}
          </p>
          <div className="caramel-directions-actions">
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="caramel-waze-btn"
            >
              {L.directions || "Get directions"}
            </a>
            <a
              href={wazeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="caramel-waze-btn"
            >
              {L.waze || "Directions via Waze"}
            </a>
          </div>
        </div>
      )}

      {hasHours && (
        <div className="caramel-venue-block">
          <h2>{L.hours || "Opening hours"}</h2>
          <ul className="caramel-hours-list">
            {[1, 2, 3, 4, 5, 6, 7].map((day) => {
              const isToday = day === todayDay;
              const entries = profile.hours.filter((h) => h.day_of_week === day && !h.is_closed);
              const dayName = new Intl.DateTimeFormat(locale, {
                weekday: "long",
                timeZone: "UTC",
              }).format(new Date(Date.UTC(2024, 0, day)));

              const timeStr = entries.length
                ? entries.map((h) => `${h.open_time.slice(0, 5)}–${h.close_time.slice(0, 5)}`).join(" / ")
                : profile.hours.some((h) => h.day_of_week === day)
                  ? L.closed
                  : L.hoursUnknown;

              return (
                <li
                  key={day}
                  className={`caramel-hours-row ${isToday ? "is-today" : ""}`}
                >
                  <span>
                    {dayName}
                    {isToday && ` · ${L.today || "Today"}`}
                  </span>
                  <span>{timeStr}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
