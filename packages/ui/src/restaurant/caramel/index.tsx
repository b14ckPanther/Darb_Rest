"use client";
import React, { useEffect, useState } from "react";
import {
  type AppearanceSettings,
  type RestaurantProfile,
  restaurantMenuModel,
  resolvedLayout,
  resolveSemanticTheme,
  semanticThemeToCssVars,
} from "@darb-rest/types";
import { type MenuPreviewProps, ContentText } from "../../menu-preview";
import { CaramelHero } from "./hero";
import { CaramelIdentity } from "./identity";
import { CaramelCategoryRail } from "./categories";
import { CaramelMenuSection } from "./menu-section";
import { CaramelItemModal } from "./item-modal";
import { CaramelVenueSection, CaramelAboutSection } from "./venue";
import { CaramelFooter } from "./footer";
import type { CaramelItem } from "./item-card";

import { RestaurantUtilityBar } from "../utility-bar";
import type { ContentName } from "@darb-rest/types";

export { CaramelHero } from "./hero";

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

export function CaramelMenu({
  restaurant,
  ...p
}: MenuPreviewProps & { restaurant: RestaurantPresentation }) {
  const { settings, profile, labels: L } = restaurant;
  const layout = resolvedLayout(settings);
  const [selectedMenu, setSelectedMenu] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [now, setNow] = useState<Date | null>(null);

  // Modal item state
  const [modalItem, setModalItem] = useState<{
    item: CaramelItem;
    sectionItems: CaramelItem[];
    index: number;
  } | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const branchId = p.branchId ?? p.locations[0]?.id ?? "";
  const model = restaurantMenuModel(p.data, branchId, selectedMenu);
  const sections = model.sections.filter((s) => s.items.length > 0);

  // Sync active category initial
  useEffect(() => {
    if (sections[0] && !activeCategory) {
      setActiveCategory(sections[0].id);
    }
  }, [sections, activeCategory]);

  const resolvedTheme = resolveSemanticTheme("caramel", settings);
  const style = {
    ...semanticThemeToCssVars(resolvedTheme),
  } as React.CSSProperties;

  function handleSelectItem(item: CaramelItem, sectionItems: CaramelItem[], itemIndex: number) {
    setModalItem({ item, sectionItems, index: itemIndex });
  }

  function handlePreviousItem() {
    if (!modalItem || modalItem.index <= 0) return;
    const prevIdx = modalItem.index - 1;
    setModalItem({
      item: modalItem.sectionItems[prevIdx]!,
      sectionItems: modalItem.sectionItems,
      index: prevIdx,
    });
  }

  function handleNextItem() {
    if (!modalItem || modalItem.index >= modalItem.sectionItems.length - 1) return;
    const nextIdx = modalItem.index + 1;
    setModalItem({
      item: modalItem.sectionItems[nextIdx]!,
      sectionItems: modalItem.sectionItems,
      index: nextIdx,
    });
  }

  return (
    <div
      className="restaurant-template rt-caramel"
      data-template="caramel"
      data-density={settings.density}
      data-hero={layout.hero}
      data-focal={layout.focal}
      data-cards={layout.cards}
      data-surface={layout.surface}
      style={style}
    >
      <CaramelHero
        name={p.business.name}
        locale={p.locale}
        settings={settings}
        previewMedia={restaurant.previewMedia}
        label={L.restaurant ?? ""}
        utilityBar={
          <RestaurantUtilityBar
            locale={p.locale}
            showLanguageSwitcher={settings.showLanguageSwitcher !== false}
            branches={restaurant.branches}
            currentBranchSlug={restaurant.currentBranchSlug}
            businessSlug={restaurant.businessSlug}
            branchLabel={L.branch ?? "Branch"}
            confirmBranchLabel={restaurant.confirmBranchLabel}
            languageLabel={L.language ?? "Language"}
            variant="caramel"
          />
        }
      />

      <CaramelIdentity
        name={p.business.name}
        locale={p.locale}
        settings={settings}
        profile={profile}
        labels={L}
        now={now}
        previewMedia={restaurant.previewMedia}
      />

      {model.menus.length > 1 && (
        <div className="rt-menu-switch" role="group" aria-label={p.labels.title}>
          {model.menus.map((m) => (
            <button
              key={m.id}
              aria-pressed={model.menu?.id === m.id}
              onClick={() => setSelectedMenu(m.id)}
            >
              <ContentText value={m.name_i18n} locale={p.locale} />
            </button>
          ))}
        </div>
      )}

      <CaramelCategoryRail
        sections={sections}
        locale={p.locale}
        activeId={activeCategory}
        onSelect={setActiveCategory}
        labels={p.labels}
      />

      <main className="caramel-menu-board" id="restaurant-menu">
        {sections.length === 0 ? (
          <p className="rt-empty">{p.labels.noPreview}</p>
        ) : (
          sections.map((section, idx) => (
            <CaramelMenuSection
              key={section.id}
              section={section}
              index={idx}
              locale={p.locale}
              images={p.images}
              labels={{ ...p.labels, ...L }}
              showImages={settings.images}
              onSelectItem={handleSelectItem}
              onConfigure={p.onConfigure}
              addLabel={p.addLabel}
            />
          ))
        )}
      </main>

      <CaramelAboutSection
        story={
          (profile as unknown as Record<string, string | undefined>).story ||
          (profile as unknown as Record<string, string | undefined>).about ||
          null
        }
        labels={L}
      />

      <CaramelVenueSection
        profile={profile}
        locale={p.locale}
        labels={L}
        now={now}
      />

      <CaramelFooter
        name={p.business.name}
        locale={p.locale}
        settings={settings}
        profile={profile}
        labels={{ ...p.labels, ...L }}
        previewMedia={restaurant.previewMedia}
      />

      {modalItem && (
        <CaramelItemModal
          item={modalItem.item}
          locale={p.locale}
          images={p.images}
          labels={{ ...p.labels, ...L }}
          position={modalItem.index + 1}
          total={modalItem.sectionItems.length}
          onClose={() => setModalItem(null)}
          onPrevious={modalItem.index > 0 ? handlePreviousItem : undefined}
          onNext={modalItem.index < modalItem.sectionItems.length - 1 ? handleNextItem : undefined}
          onConfigure={p.onConfigure}
          addLabel={p.addLabel}
        />
      )}
    </div>
  );
}
