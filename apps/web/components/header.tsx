"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslation, getDirection } from "@darb-rest/i18n";
import { adminUrl } from "./admin-url";
import { IconClose, IconMenuBurger } from "@darb-rest/icons";
import { LocaleSwitcher } from "./locale-switcher";

export function Header({ solid = false }: { solid?: boolean }) {
  const { t, locale } = useTranslation();
  const direction = getDirection(locale);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  // Close mobile menu on escape key
  useEffect(() => {
    if (!mobileOpen) return;
    const focusable = () =>
      Array.from(menuRef.current?.querySelectorAll<HTMLElement>("a[href], button") ?? []);
    focusable()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Tab") {
        const items = focusable();
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
      if (e.key === "Escape") closeMobile();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      triggerRef.current?.focus();
    };
  }, [mobileOpen, closeMobile]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const navLinks = [
    { label: t("web.navProduct"), href: `/${locale}#product` },
    { label: t("web.navRestaurants"), href: `/${locale}#restaurants` },
    { label: t("web.navPlans"), href: `/${locale}/pricing` },
    { label: t("web.navAbout"), href: `/${locale}/contact` },
  ];

  return (
    <>
      <header
        role="banner"
        className={`marketing-header fixed top-0 z-50 w-full transition-all ${
          scrolled || solid
            ? "bg-[var(--warm-ivory)]/95 backdrop-blur-lg shadow-[0_1px_0_var(--border-subtle)]"
            : "bg-transparent [&_nav_a]:text-white/85 [&_nav_a:hover]:text-white [&_a[target]]:text-white"
        }`}
        style={{
          transitionDuration: "var(--motion-medium)",
          transitionTimingFunction: "var(--ease-premium)",
        }}
      >
        <div
          className={`mx-auto flex items-center justify-between transition-all ${
            scrolled ? "h-14 max-w-6xl px-4 sm:px-6" : "h-16 max-w-7xl px-5 sm:px-8"
          }`}
          style={{
            transitionDuration: "var(--motion-medium)",
            transitionTimingFunction: "var(--ease-premium)",
          }}
        >
          {/* Logo */}
          <Link
            href={`/${locale}`}
            className="relative flex min-h-11 shrink-0 items-center rounded-md bg-[var(--warm-ivory)]/95 px-2 py-1"
            aria-label="Darb REST"
          >
            <Image
              src="/brand/optimized/darb-rest-logo-header.webp"
              unoptimized
              style={{ width: "auto" }}
              alt="Darb REST"
              width={108}
              height={36}
              className="h-7 w-auto object-contain sm:h-9"
              priority
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="px-3.5 py-2 text-sm font-medium text-[var(--fg-muted)] transition-colors hover:text-[var(--fg-default)]"
                style={{ transitionDuration: "var(--motion-fast)" }}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden items-center gap-3 lg:flex">
            <LocaleSwitcher currentLocale={locale} />
            <a
              href={new URL(`/${locale}/auth/signin`, adminUrl).toString()}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-[var(--fg-muted)] transition-colors hover:text-[var(--fg-default)]"
              style={{ transitionDuration: "var(--motion-fast)" }}
            >
              {t("web.navSignIn")}
            </a>
            <Link
              href={`/${locale}/get-started`}
              className="inline-flex h-10 items-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-5 text-sm font-semibold text-[var(--color-primary-fg)] transition-all hover:bg-[var(--color-primary-hover)] hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2"
              style={{ transitionDuration: "var(--motion-fast)" }}
            >
              {t("web.navGetStarted")}
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex items-center gap-2 rounded-md bg-[var(--warm-ivory)]/95 px-1 lg:hidden">
            <LocaleSwitcher currentLocale={locale} variant="compact" />
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              ref={triggerRef}
              aria-controls="mobile-navigation"
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? t("web.navMenuClose") : t("web.navMenuOpen")}
              className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] text-[var(--fg-default)] transition-colors hover:bg-[var(--bg-surface-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              {mobileOpen ? <IconClose size={22} /> : <IconMenuBurger size={22} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Sheet */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
            onClick={closeMobile}
            aria-hidden="true"
          />

          {/* Sheet */}
          <div
            className={`fixed top-0 z-50 flex h-full w-[min(80vw,320px)] flex-col bg-[var(--warm-ivory)] shadow-xl lg:hidden ${
              direction === "rtl" ? "right-0" : "left-0"
            }`}
            ref={menuRef}
            id="mobile-navigation"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            {/* Sheet Header */}
            <div className="flex h-16 items-center justify-between px-5">
              <Image
                src="/brand/optimized/darb-rest-logo-header.webp"
                unoptimized
                style={{ width: "auto" }}
                alt="Darb REST"
                width={90}
                height={30}
                className="h-7 w-auto object-contain"
              />
              <button
                type="button"
                onClick={closeMobile}
                aria-label={t("web.navMenuClose")}
                className="flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] text-[var(--fg-muted)] hover:bg-[var(--bg-surface-elevated)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              >
                <IconClose size={20} />
              </button>
            </div>

            {/* Sheet Nav */}
            <nav className="flex flex-1 flex-col gap-1 px-4 pt-4" aria-label="Mobile navigation">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeMobile}
                  className="rounded-[var(--radius-md)] px-4 py-3 text-base font-medium text-[var(--fg-default)] transition-colors hover:bg-[var(--bg-surface-elevated)]"
                >
                  {link.label}
                </Link>
              ))}

              <div className="my-4 h-px bg-[var(--border-subtle)]" />

              <a
                href={new URL(`/${locale}/auth/signin`, adminUrl).toString()}
                target="_blank"
                rel="noreferrer"
                onClick={closeMobile}
                className="rounded-[var(--radius-md)] px-4 py-3 text-base font-medium text-[var(--fg-muted)] transition-colors hover:bg-[var(--bg-surface-elevated)]"
              >
                {t("web.navSignIn")}
              </a>
            </nav>

            {/* Sheet CTA */}
            <div className="border-t border-[var(--border-subtle)] p-4">
              <Link
                href={`/${locale}/get-started`}
                onClick={closeMobile}
                className="flex h-12 w-full items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary)] text-sm font-semibold text-[var(--color-primary-fg)] transition-colors hover:bg-[var(--color-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              >
                {t("web.navGetStarted")}
              </Link>
            </div>
          </div>
        </>
      )}
    </>
  );
}
