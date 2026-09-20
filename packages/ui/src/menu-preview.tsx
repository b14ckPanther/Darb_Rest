"use client";
import React, { useState } from "react";
import {
  localizedContent,
  sortContent,
  restaurantMenuModel,
  formatMenuPrice,
  type ContentData,
  type ContentLocale,
  type ContentName,
} from "@darb-rest/types";
export interface MenuPreviewProps {
  data: ContentData;
  locale: ContentLocale;
  business: { name: ContentName };
  locations: { id: string; name: ContentName }[];
  branding?: {
    logo_url: string | null;
    primary_color: string | null;
    accent_color: string | null;
  } | null;
  images: Record<string, string>;
  labels: Record<string, string>;
  initialMenuId?: string;
  branchId?: string;
  onBranchChange?: (id: string) => void;
  onConfigure?: (id: string) => void;
  addLabel?: string;
}
export function ContentText({ value, locale }: { value: ContentName; locale: ContentLocale }) {
  const v = localizedContent(value, locale);
  return (
    <span lang={v.lang} dir={v.lang === "en" ? "ltr" : "rtl"}>
      {v.text}
    </span>
  );
}
export function MenuPreview({
  data,
  locale,
  business,
  locations,
  branding,
  images,
  labels: L,
  initialMenuId,
  branchId,
  onBranchChange,
  onConfigure,
  addLabel,
}: MenuPreviewProps) {
  const [localBranch, setLocalBranch] = useState(locations[0]?.id ?? "");
  const branch = branchId ?? localBranch;
  const [selected, setSelected] = useState(initialMenuId ?? "");
  const { menus, menu, sections } = restaurantMenuModel(data, branch, selected, false);
  const color = /^#[0-9a-f]{6}$/i.test(branding?.primary_color ?? "")
    ? branding!.primary_color!
    : "#1a3c2a";
  const accent = /^#[0-9a-f]{6}$/i.test(branding?.accent_color ?? "")
    ? branding!.accent_color!
    : "#d5b17a";
  return (
    <div
      className="mx-auto max-w-4xl overflow-hidden rounded-2xl bg-[#faf8f4] text-[#202620]"
      style={{ borderTop: `6px solid ${color}` }}
    >
      <header className="px-5 py-8 sm:px-10">
        <div className="flex items-center gap-4">
          {branding?.logo_url && (
            <img src={branding.logo_url} alt="" className="h-14 w-14 object-contain" />
          )}
          <h1 className="text-3xl font-bold">
            <ContentText value={business.name} locale={locale} />
          </h1>
        </div>
        <p className="mt-3 text-sm text-[#526052]">{L.previewNote}</p>
        <label className="mt-5 block text-sm">
          {L.chooseBranch}
          <select
            aria-label={L.chooseBranch}
            className="mt-2 block min-h-11 w-full rounded-lg border bg-white p-2"
            value={branch}
            onChange={(e) =>
              onBranchChange ? onBranchChange(e.target.value) : setLocalBranch(e.target.value)
            }
          >
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {localizedContent(l.name, locale).text}
              </option>
            ))}
          </select>
        </label>
        <nav aria-label={L.title} className="mt-5 flex flex-wrap gap-2">
          {menus.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelected(m.id)}
              aria-pressed={menu?.id === m.id}
              className={`min-h-11 rounded-full px-5 text-sm ${menu?.id === m.id ? "bg-[#1a3c2a] text-white" : "border border-[#ced7ca] bg-white"}`}
            >
              <ContentText value={m.name_i18n} locale={locale} />
              {m.status === "draft" && <span className="ms-2 text-xs">({L.draft})</span>}
            </button>
          ))}
        </nav>
      </header>
      {!menu ? (
        <p className="p-10">{L.noPreview}</p>
      ) : (
        <>
          <nav
            className="sticky top-0 z-10 flex flex-wrap gap-2 border-y border-[#ddd] bg-[#faf8f4] px-5 py-3"
            aria-label={L.sections}
          >
            {sections.map((s) => (
              <a
                className="min-h-11 rounded-lg px-3 py-2 text-sm underline-offset-4 hover:underline"
                key={s.id}
                href={`#section-${s.id}`}
              >
                <ContentText value={s.name_i18n} locale={locale} />
              </a>
            ))}
          </nav>
          {sections.map((section) => (
            <section
              key={section.id}
              id={`section-${section.id}`}
              className="scroll-mt-24 px-5 py-8 sm:px-10"
            >
              <h2 className="mb-5 text-2xl font-bold">
                <ContentText value={section.name_i18n} locale={locale} />
              </h2>
              <p className="mb-4 text-sm text-[#526052]">
                <ContentText value={section.description_i18n} locale={locale} />
              </p>
              <div className="divide-y divide-[#ddd]">
                {section.items.map((item) => {
                  const variants = item.variants;
                  const groups = item.groups;
                  return (
                    <article key={item.id} className="py-6">
                      <div className="flex gap-4 sm:gap-6">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-lg font-semibold">
                            <ContentText value={item.name_i18n} locale={locale} />
                          </h3>
                          <p className="mt-2 text-sm leading-relaxed text-[#526052]">
                            <ContentText value={item.description_i18n} locale={locale} />
                          </p>
                          <p className="mt-3 font-semibold">
                            {variants.length > 0 && <span className="me-1 text-xs">{L.from}</span>}
                            <bdi dir="ltr">
                              {formatMenuPrice(item.price, item.currency, locale)}
                            </bdi>
                          </p>
                          {!item.is_available && (
                            <p className="mt-2 text-sm font-medium text-[#8b3a16]">{L.soldOut}</p>
                          )}
                        </div>
                        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-[#e9e5da] sm:h-32 sm:w-32">
                          {item.image_path && images[item.image_path] ? (
                            <img
                              src={images[item.image_path]}
                              alt={localizedContent(item.name_i18n, locale).text}
                              width={256}
                              height={256}
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div
                              aria-hidden="true"
                              className="h-full w-full bg-gradient-to-br from-[#ede8de] to-[#d8d1bd]"
                            />
                          )}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {data.item_dietary_tags
                          .filter((t) => t.item_id === item.id)
                          .map((t) => (
                            <span
                              key={t.id}
                              className="rounded-full bg-[#e6eddf] px-2 py-1 text-xs"
                            >
                              {L[t.code]}
                            </span>
                          ))}
                      </div>
                      {onConfigure && menu.status === "active" && item.is_available && (
                        <button
                          type="button"
                          onClick={() => onConfigure(item.id)}
                          className="mt-4 min-h-11 rounded-full bg-[#1a3c2a] px-5 text-sm font-semibold text-white"
                        >
                          {addLabel}
                        </button>
                      )}
                      <details className="mt-3 text-sm">
                        <summary className="min-h-11 cursor-pointer py-2">{L.details}</summary>
                        <ul className="space-y-2">
                          {variants.map((v) => (
                            <li key={v.id} className="flex justify-between gap-3">
                              <ContentText value={v.name_i18n} locale={locale} />
                              <bdi>{formatMenuPrice(v.price, item.currency, locale)}</bdi>
                            </li>
                          ))}
                        </ul>
                        {groups.map((g) => (
                          <div key={g.id} className="mt-4">
                            <h4 className="font-semibold">
                              <ContentText value={g.name_i18n} locale={locale} /> ({g.min_select}–
                              {g.max_select})
                            </h4>
                            {sortContent(
                              data.modifiers.filter(
                                (m) => m.modifier_group_id === g.id && m.is_available,
                              ),
                            ).map((m) => (
                              <p key={m.id} className="mt-1 flex justify-between gap-3">
                                <ContentText value={m.name_i18n} locale={locale} />
                                <bdi>+{formatMenuPrice(m.price_delta, item.currency, locale)}</bdi>
                              </p>
                            ))}
                          </div>
                        ))}
                        <p className="mt-3">
                          {L.allergens}:{" "}
                          {data.item_allergens
                            .filter((a) => a.item_id === item.id)
                            .map((a) => L[a.code])
                            .join(" · ") || "—"}
                        </p>
                      </details>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </>
      )}
      <footer
        style={{ borderBottom: `4px solid ${accent}` }}
        className="border-t border-[#ddd] p-5 text-xs leading-relaxed text-[#526052]"
      >
        {L.disclaimer}
      </footer>
    </div>
  );
}
