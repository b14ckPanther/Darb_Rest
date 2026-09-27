import React from "react";
import Image from "next/image";
import Link from "next/link";
import { getDictionary, type SupportedLocale } from "@darb-rest/i18n";
import {
  IconChannelMail,
  IconGitHub,
  IconInstagram,
  IconLinkedIn,
  IconPortfolio,
} from "@darb-rest/icons";
import { LocaleSwitcher } from "./locale-switcher";

const darbInstagram = "https://www.instagram.com/darbco/";
const darbEmail = "founder@darb.co.il";

const founderProfiles = [
  { href: "https://www.instagram.com/noormosa.97/", key: "founderInstagram", Icon: IconInstagram },
  { href: "https://github.com/b14ckPanther", key: "founderGithub", Icon: IconGitHub },
  { href: "https://www.linkedin.com/in/nmprofessor/", key: "founderLinkedin", Icon: IconLinkedIn },
  { href: "https://portfolio.darb.co.il", key: "founderPortfolio", Icon: IconPortfolio },
] as const;

export function Footer({ locale }: { locale: SupportedLocale }) {
  const dict = getDictionary(locale);

  const columns = [
    {
      title: dict.web.footerProduct,
      links: [
        { label: dict.web.footerDigitalMenu, href: `/${locale}#product` },
        { label: dict.web.footerLocations, href: `/${locale}#restaurants` },
        { label: dict.web.footerBranding, href: `/${locale}#restaurants` },
        { label: dict.web.plansCtaText, href: `/${locale}/pricing` },
      ],
    },
    {
      title: dict.web.footerCompany,
      links: [
        { label: dict.web.footerAbout, href: `/${locale}#restaurants` },
        { label: dict.web.footerContact, href: `/${locale}/contact` },
      ],
    },
    {
      title: dict.web.footerLegal,
      links: [
        { label: dict.web.footerPrivacy, href: `/${locale}/privacy` },
        { label: dict.web.footerTerms, href: `/${locale}/terms` },
      ],
    },
  ];

  const creditName =
    locale === "he" ? (
      <bdi lang="en" dir="ltr">
        {dict.web.footerCreditName}
      </bdi>
    ) : (
      dict.web.footerCreditName
    );

  return (
    <footer id="footer" className="rs-footer" role="contentinfo">
      <div className="rs-shell rs-footer__top">
        <div className="rs-footer__brand">
          <Link href={`/${locale}`} aria-label="Darb REST">
            <Image
              src="/brand/optimized/darb-rest-logo-dark-tight.webp"
              unoptimized
              alt="Darb REST"
              width={99}
              height={52}
            />
          </Link>
          <p>{dict.web.footerTagline}</p>
          <a className="rs-footer__darb" href={`https://darb.co.il/${locale}`}>
            <span className="rs-diamond" aria-hidden="true" />
            {dict.web.darbPath}
          </a>
          <ul className="rs-footer__channels">
            <li>
              <a
                href={darbInstagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={dict.web.darbInstagram}
              >
                <IconInstagram />
                <span lang="en" dir="ltr">
                  @darbco
                </span>
              </a>
            </li>
            <li>
              <a href={`mailto:${darbEmail}`}>
                <IconChannelMail />
                <span lang="en" dir="ltr">
                  {darbEmail}
                </span>
              </a>
            </li>
          </ul>
        </div>
        {columns.map((column) => (
          <nav key={column.title} className="rs-footer__column" aria-label={column.title}>
            <h2>{column.title}</h2>
            <ul>
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="rs-shell rs-footer__bottom">
        <p>{dict.web.footerCopyright}</p>
        <div className="rs-footer__founder">
          <p className="rs-footer__credit">
            {dict.web.footerCreditLead}{" "}
            <a href="https://portfolio.darb.co.il" rel="author">
              {creditName}
            </a>
          </p>
          <ul className="rs-footer__profiles" aria-label={dict.web.founderLinks}>
            {founderProfiles.map(({ href, key, Icon }) => (
              <li key={href}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer me"
                  aria-label={dict.web[key]}
                  title={dict.web[key]}
                >
                  <Icon />
                </a>
              </li>
            ))}
          </ul>
        </div>
        <LocaleSwitcher currentLocale={locale} variant="signage" />
      </div>
    </footer>
  );
}
