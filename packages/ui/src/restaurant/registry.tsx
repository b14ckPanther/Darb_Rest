"use client";
import { TEMPLATE_CATALOG } from "@darb-rest/types";
import React from "react";
import { RestaurantImage } from "./image";
import {
  type AppearanceSettings,
  type ContentName,
  type ContentLocale,
  type TemplateMetadata,
  brandingUrl,
  brandingSrcSet,
} from "@darb-rest/types";
import { ContentText } from "../menu-preview";
export interface HeroProps {
  name: ContentName;
  locale: ContentLocale;
  settings: AppearanceSettings;
  label: string;
  previewMedia?: boolean;
}
function Cover({ settings, previewMedia }: HeroProps) {
  const cover = brandingUrl(settings.cover, previewMedia);
  return (
    <div className="rt-cover">
      {cover && (
        <RestaurantImage
          key={cover}
          src={cover}
          srcSet={brandingSrcSet(settings.cover, previewMedia)}
          sizes="(max-width: 700px) 100vw, 80vw"
          width={1920}
          height={1280}
          alt=""
          fetchPriority="high"
          referrerPolicy="no-referrer"
        />
      )}
    </div>
  );
}
function Identity(p: HeroProps) {
  const logo = brandingUrl(p.settings.logo, p.previewMedia);
  return (
    <div className="rt-identity">
      {logo && (
        <RestaurantImage
          key={logo}
          className="rt-logo"
          src={logo}
          width={88}
          height={88}
          alt=""
          referrerPolicy="no-referrer"
        />
      )}
      <p className="rt-eyebrow">{p.label}</p>
      <h1>
        <ContentText value={p.name} locale={p.locale} />
      </h1>
    </div>
  );
}
function Signature(p: HeroProps) {
  return (
    <header className="rt-hero">
      <Cover {...p} />
      <Identity {...p} />
    </header>
  );
}
function Editorial(p: HeroProps) {
  return (
    <header className="rt-hero">
      <Identity {...p} />
      <div className="rt-editorial-cover">
        <Cover {...p} />
        <span aria-hidden="true">01 /</span>
      </div>
    </header>
  );
}
function Minimal(p: HeroProps) {
  return (
    <header className="rt-hero">
      <Identity {...p} />
    </header>
  );
}
function Cafe(p: HeroProps) {
  return (
    <header className="rt-hero">
      <div className="rt-cafe-portrait">
        <Cover {...p} />
      </div>
      <Identity {...p} />
    </header>
  );
}
function Quick(p: HeroProps) {
  return (
    <header className="rt-hero">
      <Identity {...p} />
      <Cover {...p} />
    </header>
  );
}
function Bold(p: HeroProps) {
  return (
    <header className="rt-hero">
      <Cover {...p} />
      <div className="rt-bold-title">
        <Identity {...p} />
      </div>
    </header>
  );
}
function Night(p: HeroProps) {
  return (
    <header className="rt-hero">
      <Identity {...p} />
      <Cover {...p} />
    </header>
  );
}
function Bakery(p: HeroProps) {
  return (
    <header className="rt-hero">
      <div className="rt-bakery-title">
        <Identity {...p} />
      </div>
      <Cover {...p} />
    </header>
  );
}
export interface RestaurantTemplate extends TemplateMetadata {
  Hero: React.ComponentType<HeroProps>;
  className: string;
}
const heroes: Record<string, RestaurantTemplate["Hero"]> = {
  signature: Signature,
  editorial: Editorial,
  minimal: Minimal,
  cafe: Cafe,
  quick: Quick,
  bold: Bold,
  night: Night,
  bakery: Bakery,
};
export const RESTAURANT_TEMPLATES: readonly RestaurantTemplate[] = TEMPLATE_CATALOG.map((t) => ({
  ...t,
  Hero: heroes[t.id]!,
  className: `rt-${t.id}`,
}));
const registry = new Map(RESTAURANT_TEMPLATES.map((t) => [t.id, t]));
export function restaurantTemplate(id: string) {
  return registry.get(id) ?? RESTAURANT_TEMPLATES[0]!;
}
