"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslation, getDirection } from "@darb-rest/i18n";
import { ArrowEnd, IconClose, IconMenuBurger } from "@darb-rest/icons";
import { adminUrl } from "./admin-url";
import { LocaleSwitcher } from "./locale-switcher";

export function Header({ solid = false }: { solid?: boolean }) {
  const { t, locale } = useTranslation();
  const direction = getDirection(locale);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (mobileOpen && !dialog.open) dialog.showModal();
    if (!mobileOpen && dialog.open) dialog.close();
  }, [mobileOpen]);

  const signInHref = new URL(`/${locale}/auth/signin`, adminUrl).toString();
  const navLinks = [
    { label: t("web.navProduct"), href: `/${locale}#product` },
    { label: t("web.navRestaurants"), href: `/${locale}#restaurants` },
    { label: t("web.navPlans"), href: `/${locale}/pricing` },
    { label: t("web.navAbout"), href: `/${locale}/contact` },
  ];

  return (
    <header
      role="banner"
      className={`marketing-header rs-header${solid ? " rs-header--solid" : ""}`}
    >
      <div className="rs-header__bar">
        <Link href={`/${locale}`} className="rs-header__home" aria-label="Darb REST">
          <Image
            src="/brand/optimized/darb-rest-logo-dark-tight.webp"
            unoptimized
            alt="Darb REST"
            width={76}
            height={40}
            priority
          />
        </Link>

        <nav className="rs-header__nav" aria-label={t("web.navMenuTitle")}>
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="rs-header__actions">
          <LocaleSwitcher currentLocale={locale} variant="signage" />
          <a className="rs-header__sign-in" href={signInHref} target="_blank" rel="noreferrer">
            {t("web.navSignIn")}
          </a>
          <Link
            className="rs-button rs-button--gold rs-button--compact"
            href={`/${locale}/get-started`}
          >
            {t("web.navGetStarted")}
          </Link>
        </div>

        <div className="rs-header__compact">
          <LocaleSwitcher currentLocale={locale} variant="signage-compact" />
          <button
            ref={triggerRef}
            type="button"
            className="rs-menu-button"
            onClick={() => setMobileOpen(true)}
            aria-controls="mobile-navigation"
            aria-expanded={mobileOpen}
            aria-haspopup="dialog"
            aria-label={t("web.navMenuOpen")}
          >
            <IconMenuBurger size={22} />
          </button>
        </div>
      </div>

      <dialog
        ref={dialogRef}
        id="mobile-navigation"
        className="rs-directory"
        aria-label={t("web.navMenuTitle")}
        onCancel={closeMobile}
        onClose={() => {
          setMobileOpen(false);
          triggerRef.current?.focus();
        }}
      >
        <div className="rs-directory__panel">
          <div className="rs-directory__header">
            <span className="rs-header__home">
              <Image
                src="/brand/optimized/darb-rest-logo-dark-tight.webp"
                unoptimized
                alt="Darb REST"
                width={68}
                height={36}
              />
            </span>
            <button
              type="button"
              className="rs-menu-button"
              onClick={closeMobile}
              aria-label={t("web.navMenuClose")}
            >
              <IconClose size={20} />
            </button>
          </div>

          <nav className="rs-directory__links" aria-label={t("web.navMenuTitle")}>
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} onClick={closeMobile}>
                <span>{link.label}</span>
                <ArrowEnd className="rs-arrow" direction={direction} size={22} />
              </Link>
            ))}
          </nav>

          <div className="rs-directory__footer">
            <Link
              className="rs-button rs-button--gold"
              href={`/${locale}/get-started`}
              onClick={closeMobile}
            >
              {t("web.navGetStarted")}
              <ArrowEnd className="rs-arrow" direction={direction} size={18} />
            </Link>
            <a
              className="rs-button rs-button--line"
              href={signInHref}
              target="_blank"
              rel="noreferrer"
              onClick={closeMobile}
            >
              {t("web.navSignIn")}
            </a>
          </div>
        </div>
      </dialog>
    </header>
  );
}
