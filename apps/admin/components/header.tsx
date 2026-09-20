"use client";

import React, { useState } from "react";
import { useTranslation } from "@darb-rest/i18n";
import { Button } from "@darb-rest/ui";
import {
  IconMenuBurger,
  IconLogOut,
  IconChevronDown,
  IconCheck,
  IconBuilding,
  IconStore,
} from "@darb-rest/icons";
import { LocaleSwitcher } from "./locale-switcher";
import { useTenantContext } from "./tenant-context";

export interface HeaderProps {
  onOpenSidebar: () => void;
}

export function Header({ onOpenSidebar }: HeaderProps) {
  const { t, locale } = useTranslation();
  const { activeBusiness, accessibleBusinesses, activeLocation } = useTenantContext();
  const [selectorOpen, setSelectorOpen] = useState(false);

  const businessName = activeBusiness
    ? typeof activeBusiness.name === "object"
      ? activeBusiness.name[locale] ||
        activeBusiness.name.en ||
        Object.values(activeBusiness.name)[0]
      : String(activeBusiness.name)
    : t("admin.selectBusiness");

  const branchName = activeLocation
    ? typeof activeLocation.name === "object"
      ? activeLocation.name[locale] ||
        activeLocation.name.en ||
        Object.values(activeLocation.name)[0]
      : String(activeLocation.name)
    : t("admin.allBranches");

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 px-4 backdrop-blur-md sm:px-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="Open sidebar"
          className="lg:hidden rounded-[var(--radius-sm)] p-2 text-[var(--fg-muted)] hover:bg-[var(--bg-surface-elevated)] hover:text-[var(--fg-default)] cursor-pointer"
        >
          <IconMenuBurger size={20} />
        </button>

        {/* Business Selector */}
        {activeBusiness && accessibleBusinesses.length > 1 && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setSelectorOpen(!selectorOpen)}
              className="flex items-center gap-2 rounded-[var(--radius-md)] px-2.5 py-1.5 text-sm font-medium text-[var(--fg-default)] transition-colors hover:bg-[var(--bg-surface-elevated)] cursor-pointer"
            >
              <span className="max-w-[160px] truncate">{businessName}</span>
              <IconChevronDown size={14} className="text-[var(--fg-muted)]" />
            </button>

            {selectorOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setSelectorOpen(false)}
                  aria-hidden="true"
                />
                <div className="absolute start-0 top-full z-50 mt-1 w-60 rounded-[var(--radius-lg)] border border-[var(--border-default)] bg-[var(--bg-surface)] p-1 shadow-lg">
                  <div className="px-2.5 py-1.5 text-xs font-medium text-[var(--fg-subtle)]">
                    {t("admin.switchBusiness")}
                  </div>
                  {accessibleBusinesses.map((b) => {
                    const isCurrent = b.id === activeBusiness.id;
                    return (
                      <a
                        key={b.id}
                        href={`/auth/switch-business?businessId=${b.id}&redirectUrl=/${locale}`}
                        className={`flex items-center justify-between rounded-[var(--radius-md)] px-2.5 py-2 text-sm transition-colors ${
                          isCurrent
                            ? "bg-[var(--darb-green-deep)]/8 text-[var(--darb-green-deep)] font-medium"
                            : "text-[var(--fg-default)] hover:bg-[var(--bg-surface-elevated)]"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <IconBuilding size={14} className="shrink-0" />
                          <span className="truncate">{b.name}</span>
                        </div>
                        {isCurrent && <IconCheck size={14} />}
                      </a>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {/* Branch Indicator */}
        {activeBusiness && (
          <div className="hidden items-center gap-2 border-s border-[var(--border-subtle)] ps-3 text-sm text-[var(--fg-muted)] sm:flex">
            <IconStore size={14} />
            <span className="max-w-[140px] truncate font-medium">{branchName}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <LocaleSwitcher currentLocale={locale} />
        <a href="/auth/signout" title={t("auth.signOut")}>
          <Button variant="ghost" size="sm" startIcon={<IconLogOut size={14} />}>
            <span className="hidden sm:inline">{t("auth.signOut")}</span>
          </Button>
        </a>
      </div>
    </header>
  );
}
