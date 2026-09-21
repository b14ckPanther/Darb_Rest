"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { activationLabels, useTranslation, getDirection } from "@darb-rest/i18n";
import {
  IconMenu,
  IconLayers,
  IconBuilding,
  IconSettings,
  IconClose,
  IconUser,
} from "@darb-rest/icons";
import { canManageOrders, canManageBranding, canViewAnalytics } from "@darb-rest/types";
import { useTenantContext } from "./tenant-context";

export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { t, locale } = useTranslation();
  const direction = getDirection(locale);
  const pathname = usePathname();
  const { activeBusiness, activeMembership, user } = useTenantContext();

  const businessName = activeBusiness
    ? typeof activeBusiness.name === "object"
      ? activeBusiness.name[locale] ||
        activeBusiness.name.en ||
        Object.values(activeBusiness.name)[0]
      : String(activeBusiness.name)
    : user.isPlatformAdmin
      ? t("platform.title")
      : t("admin.noBusinessFound");

  // Only show routes that actually exist
  const tenantItems = [
    ...(canManageBranding(activeMembership?.role ?? "read_only")
      ? [{ href: `/${locale}/launch`, label: t("launch.title"), icon: <IconLayers size={18} /> }]
      : []),
    ...(canViewAnalytics(activeMembership?.role ?? "staff")
      ? [
          {
            href: `/${locale}/analytics`,
            label: t("analytics.title"),
            icon: <IconLayers size={18} />,
          },
        ]
      : []),
    ...(canManageBranding(activeMembership?.role ?? "read_only")
      ? [
          {
            href: `/${locale}/appearance/templates`,
            label: t("appearance.title"),
            icon: <IconLayers size={18} />,
          },
        ]
      : []),
    { href: `/${locale}/operations`, label: t("operations.title"), icon: <IconLayers size={18} /> },
    { href: `/${locale}/kitchen`, label: t("kitchen.title"), icon: <IconLayers size={18} /> },
    { href: `/${locale}/tables`, label: t("tables.title"), icon: <IconLayers size={18} /> },
    { href: `/${locale}/orders`, label: t("ordering.title"), icon: <IconLayers size={18} /> },
    { href: `/${locale}/menus`, label: t("content.title"), icon: <IconMenu size={18} /> },
    {
      href: `/${locale}`,
      label: t("navigation.overview"),
      icon: <IconLayers size={18} />,
    },
    {
      href: `/${locale}/locations`,
      label: t("navigation.locations"),
      icon: <IconBuilding size={18} />,
    },
    {
      href: `/${locale}/settings`,
      label: t("navigation.settings"),
      icon: <IconSettings size={18} />,
    },
    {
      href: `/${locale}/account`,
      label: activationLabels[locale].account,
      icon: <IconUser size={18} />,
    },
  ].filter((item) => !/\/(orders|tables|kitchen|operations|analytics)$/.test(item.href));

  const navItems = [
    ...(user.isPlatformAdmin
      ? [
          {
            href: `/${locale}/platform`,
            label: t("platform.title"),
            icon: <IconBuilding size={18} />,
          },
        ]
      : []),
    ...(!user.isPlatformAdmin || activeBusiness ? tenantItems : []),
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 start-0 z-50 flex w-60 flex-col bg-[var(--bg-surface)] transition-transform lg:translate-x-0 ${
          isOpen
            ? "translate-x-0"
            : direction === "rtl"
              ? "max-lg:hidden translate-x-full lg:translate-x-0"
              : "max-lg:hidden -translate-x-full lg:translate-x-0"
        }`}
        style={{
          transitionDuration: "200ms",
          transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* Brand */}
        <div className="flex h-14 items-center justify-between px-4 border-b border-[var(--border-subtle)]">
          <Link href={`/${locale}`} aria-label="Darb REST" className="shrink-0">
            <Image
              src="/brand/darb-rest-logo-header.png"
              alt="Darb REST"
              width={84}
              height={28}
              style={{ width: "auto" }}
              className="h-7 w-auto object-contain"
            />
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.close")}
            className="lg:hidden rounded-[var(--radius-sm)] p-1.5 text-[var(--fg-muted)] hover:text-[var(--fg-default)] cursor-pointer"
          >
            <IconClose size={18} />
          </button>
        </div>

        {/* Business Context */}
        <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--darb-green-deep)]/10 text-sm font-bold text-[var(--darb-green-deep)]">
              {(businessName || "D").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-[var(--fg-default)]">
                {businessName}
              </div>
              <div className="truncate text-xs text-[var(--fg-muted)] capitalize" lang="en">
                {activeBusiness?.businessType || ""}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5" aria-label="Main navigation">
          {navItems
            .filter(
              (item) =>
                (!item.href.endsWith("/kitchen") && !item.href.endsWith("/operations")) ||
                canManageOrders(activeMembership?.role ?? "read_only"),
            )
            .map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => onClose()}
                  className={`flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[var(--darb-green-deep)] text-white"
                      : "text-[var(--fg-muted)] hover:text-[var(--fg-default)] hover:bg-[var(--bg-surface-elevated)]"
                  }`}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
        </nav>

        {/* Account Footer */}
        <div className="border-t border-[var(--border-subtle)] px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--bg-surface-elevated)] text-[var(--fg-muted)]">
              <IconUser size={14} />
            </div>
            <div className="min-w-0 flex-1">
              <div
                className="truncate text-xs font-medium text-[var(--fg-default)]"
                lang="en"
                dir="ltr"
              >
                {user.email || user.fullName}
              </div>
              <div
                className="truncate text-[11px] text-[var(--fg-muted)] capitalize"
                lang={user.isPlatformAdmin ? locale : "en"}
              >
                {user.isPlatformAdmin
                  ? t("platform.role")
                  : activeMembership?.role || t("platform.account")}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
