"use client";
import React from "react";
import {
  type AppearanceSettings,
  brandingUrl,
  brandingSrcSet,
  safePublicUrl,
} from "@darb-rest/types";
import { RestaurantImage } from "../image";
import type { HeroProps } from "../registry";

export function CaramelHeroCover({
  settings,
  previewMedia,
}: {
  settings: AppearanceSettings;
  previewMedia?: boolean;
}) {
  const cover = brandingUrl(settings.cover, previewMedia);
  const video = safePublicUrl(settings.coverVideo);

  return (
    <div className="caramel-hero-cover">
      {video ? (
        <video
          className="caramel-hero-video absolute inset-0 size-full object-cover"
          src={video}
          poster={cover || undefined}
          muted
          loop
          playsInline
          autoPlay
          preload="none"
          aria-label=""
        />
      ) : cover ? (
        <RestaurantImage
          key={cover}
          src={cover}
          srcSet={brandingSrcSet(settings.cover, previewMedia)}
          sizes="(max-width: 700px) 100vw, 85vw"
          width={1920}
          height={640}
          alt=""
          fetchPriority="high"
          referrerPolicy="no-referrer"
        />
      ) : null}
      <div className="caramel-hero-overlay" aria-hidden="true" />
    </div>
  );
}

export function CaramelHero(p: HeroProps & { utilityBar?: React.ReactNode }) {
  return (
    <header className="caramel-hero-frame" aria-label={p.label}>
      <CaramelHeroCover settings={p.settings} previewMedia={p.previewMedia} />
      {p.utilityBar}
    </header>
  );
}
