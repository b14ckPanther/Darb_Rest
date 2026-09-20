import React from "react";
import Image from "next/image";
import Link from "next/link";
import { getDictionary, type SupportedLocale } from "@darb-rest/i18n";
import { LocaleSwitcher } from "./locale-switcher";

export function Footer({ locale }: { locale: SupportedLocale }) {
  const dict = getDictionary(locale);

  const productLinks = [
    { label: dict.web.footerDigitalMenu, href: `/${locale}#product` },
    { label: dict.web.footerLocations, href: `/${locale}#restaurants` },
    { label: dict.web.footerBranding, href: `/${locale}#restaurants` },
    { label: dict.web.plansCtaText, href: `/${locale}/pricing` },
  ];

  const companyLinks = [
    { label: dict.web.footerAbout, href: `/${locale}#restaurants` },
    { label: dict.web.footerContact, href: `/${locale}/contact` },
  ];

  const legalLinks = [
    { label: dict.web.footerPrivacy, href: `/${locale}/privacy` },
    { label: dict.web.footerTerms, href: `/${locale}/terms` },
  ];

  return (
    <footer id="footer" className="bg-[var(--graphite)] text-white/80" role="contentinfo">
      <div
        className="mx-auto px-5 sm:px-8 pt-14 pb-8 sm:pt-16 lg:pt-20"
        style={{ maxWidth: "var(--content-max)" }}
      >
        {/* Top Grid */}
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-12">
          {/* Brand Column */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href={`/${locale}`}>
              <Image
                src="/brand/darb-rest-logo-dark-transparent.webp"
                unoptimized
                alt="Darb REST"
                width={130}
                height={40}
                className="h-9 w-auto object-contain"
              />
            </Link>
            <p
              className="mt-4 max-w-xs text-white/50"
              style={{ fontSize: "var(--text-sm)", lineHeight: "var(--leading-body)" }}
            >
              {dict.web.footerTagline}
            </p>
          </div>

          {/* Product Column */}
          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/40">
              {dict.web.footerProduct}
            </h4>
            <ul className="space-y-2.5" role="list">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 transition-colors hover:text-white"
                    style={{ transitionDuration: "var(--motion-fast)" }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Column */}
          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/40">
              {dict.web.footerCompany}
            </h4>
            <ul className="space-y-2.5" role="list">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 transition-colors hover:text-white"
                    style={{ transitionDuration: "var(--motion-fast)" }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal + Language */}
          <div>
            <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/40">
              {dict.web.footerLegal}
            </h4>
            <ul className="space-y-2.5" role="list">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/60 transition-colors hover:text-white"
                    style={{ transitionDuration: "var(--motion-fast)" }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Language Switcher */}
            <div className="mt-6">
              <LocaleSwitcher currentLocale={locale} variant="footer" />
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row">
          <p className="text-xs text-white/40">{dict.web.footerCopyright}</p>
          <a
            href="https://darb.co.il/en"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-white/40 transition-colors hover:text-white/60"
            style={{ transitionDuration: "var(--motion-fast)" }}
            lang="en"
            dir="ltr"
          >
            darb.co.il
          </a>
        </div>
      </div>
    </footer>
  );
}
