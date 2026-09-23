"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  IconGlobe,
  IconMapPin,
  IconChevronDown,
  IconCheck,
} from "@darb-rest/icons";
import {
  restaurantLocaleUrl,
  type ContentName,
  type ContentLocale,
} from "@darb-rest/types";
import { ContentText } from "../menu-preview";

const LOCALE_NAMES: Record<ContentLocale, string> = {
  ar: "العربية",
  he: "עברית",
  en: "English",
};

export interface RestaurantUtilityBarProps {
  locale: ContentLocale;
  showLanguageSwitcher?: boolean;
  branches?: { id: string; slug: string; name: ContentName }[];
  currentBranchSlug?: string;
  businessSlug?: string;
  branchLabel?: string;
  confirmBranchLabel?: string;
  languageLabel?: string;
  variant?: "caramel" | "default";
}

export function RestaurantUtilityBar({
  locale,
  showLanguageSwitcher = true,
  branches,
  currentBranchSlug,
  businessSlug,
  branchLabel = "Branch",
  confirmBranchLabel,
  languageLabel = "Language",
  variant = "default",
}: RestaurantUtilityBarProps) {
  const [langOpen, setLangOpen] = useState(false);
  const [branchOpen, setBranchOpen] = useState(false);

  const langRef = useRef<HTMLDivElement>(null);
  const branchRef = useRef<HTMLDivElement>(null);

  // Close popovers on click outside or Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setLangOpen(false);
        setBranchOpen(false);
      }
    }
    function handleClickOutside(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
      if (branchRef.current && !branchRef.current.contains(e.target as Node)) {
        setBranchOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const hasMultipleBranches = !!(branches && branches.length > 1);
  const currentBranch =
    branches?.find((b) => b.slug === currentBranchSlug) ?? branches?.[0];

  // If language switcher is disabled and there is at most one branch, render nothing
  if (!showLanguageSwitcher && !hasMultipleBranches) {
    return null;
  }

  const isCaramel = variant === "caramel";
  const barClass = isCaramel ? "caramel-utility-bar" : "rt-utility-bar";
  const pillClass = isCaramel ? "caramel-utility-pill" : "rt-utility-pill";
  const dropdownClass = isCaramel
    ? "caramel-utility-dropdown"
    : "rt-utility-dropdown";
  const itemClass = isCaramel ? "caramel-utility-item" : "rt-utility-item";

  const getLocaleUrl = (targetLocale: ContentLocale) => {
    if (typeof window !== "undefined") {
      return restaurantLocaleUrl(
        window.location.pathname +
          window.location.search +
          window.location.hash,
        targetLocale,
      );
    }
    if (businessSlug) {
      const q = currentBranchSlug ? `?branch=${currentBranchSlug}` : "";
      return `/${targetLocale}/${businessSlug}${q}`;
    }
    return `/${targetLocale}`;
  };

  const getBranchUrl = (slug: string) => {
    if (businessSlug) {
      return `/${locale}/${businessSlug}?branch=${slug}`;
    }
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("branch", slug);
      return url.pathname + url.search + url.hash;
    }
    return `?branch=${slug}`;
  };

  return (
    <nav className={barClass} aria-label="Restaurant utilities">
      {/* Branch selector - only rendered when multiple public branches exist */}
      {hasMultipleBranches && currentBranch ? (
        <div ref={branchRef} className="relative inline-block">
          <button
            type="button"
            className={pillClass}
            aria-label={`${branchLabel}: ${currentBranch.slug}`}
            aria-haspopup="menu"
            aria-expanded={branchOpen}
            onClick={() => {
              setBranchOpen(!branchOpen);
              setLangOpen(false);
            }}
          >
            <IconMapPin size={15} aria-hidden="true" />
            <ContentText value={currentBranch.name} locale={locale} />
            <IconChevronDown
              size={13}
              aria-hidden="true"
              className={branchOpen ? "rotate-180 transition-transform" : "transition-transform"}
            />
          </button>
          {branchOpen && (
            <div
              role="menu"
              aria-label={branchLabel}
              className={dropdownClass}
            >
              {branches.map((b) => {
                const isCurrent = b.slug === (currentBranchSlug || currentBranch.slug);
                return (
                  <a
                    key={b.id}
                    role="menuitem"
                    href={getBranchUrl(b.slug)}
                    aria-current={isCurrent ? "page" : undefined}
                    className={itemClass}
                    onClick={(e) => {
                      if (isCurrent) {
                        e.preventDefault();
                        setBranchOpen(false);
                        return;
                      }
                      if (
                        confirmBranchLabel &&
                        !window.confirm(confirmBranchLabel)
                      ) {
                        e.preventDefault();
                        return;
                      }
                      setBranchOpen(false);
                    }}
                  >
                    <ContentText value={b.name} locale={locale} />
                    {isCurrent && <IconCheck size={14} aria-hidden="true" />}
                  </a>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div aria-hidden="true" />
      )}

      {/* Language selector - compact globe icon with popover */}
      {showLanguageSwitcher && (
        <div ref={langRef} className="relative inline-block ms-auto">
          <button
            type="button"
            className={pillClass}
            aria-label={languageLabel}
            aria-haspopup="menu"
            aria-expanded={langOpen}
            onClick={() => {
              setLangOpen(!langOpen);
              setBranchOpen(false);
            }}
          >
            <IconGlobe size={15} aria-hidden="true" />
            <span className="text-xs font-semibold tracking-wide">
              {LOCALE_NAMES[locale] ?? locale.toUpperCase()}
            </span>
            <IconChevronDown
              size={13}
              aria-hidden="true"
              className={langOpen ? "rotate-180 transition-transform" : "transition-transform"}
            />
          </button>
          {langOpen && (
            <div
              role="menu"
              aria-label={languageLabel}
              className={`${dropdownClass} end-0`}
            >
              {(["ar", "he", "en"] as const).map((l) => {
                const isCurrent = l === locale;
                return (
                  <a
                    key={l}
                    role="menuitem"
                    lang={l}
                    href={getLocaleUrl(l)}
                    aria-current={isCurrent ? "page" : undefined}
                    className={itemClass}
                    onClick={(e) => {
                      if (typeof window !== "undefined") {
                        e.currentTarget.href = restaurantLocaleUrl(
                          window.location.pathname +
                            window.location.search +
                            window.location.hash,
                          l,
                        );
                      }
                      setLangOpen(false);
                    }}
                  >
                    <span>{LOCALE_NAMES[l]}</span>
                    {isCurrent && <IconCheck size={14} aria-hidden="true" />}
                  </a>
                );
              })}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
