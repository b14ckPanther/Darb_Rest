import Link from "next/link";
import React from "react";
import { getDictionary, getDirection, type SupportedLocale } from "@darb-rest/i18n";
import { ArrowEnd } from "@darb-rest/icons";
import { DoorwayOutline } from "./marketing/doorway";

/** The close: the same lit doorway, now held open for the next restaurant. */
export function FinalCta({ locale }: { locale: SupportedLocale }) {
  const dict = getDictionary(locale);
  const direction = getDirection(locale);

  return (
    <section className="rs-place rs-final" aria-labelledby="rs-final-title">
      <div className="rs-shell">
        <DoorwayOutline className="rs-final__door" lit />
        <h2 id="rs-final-title" className="rs-heading">
          {dict.web.finalCtaTitle}
        </h2>
        <p className="rs-lead">{dict.web.finalCtaDesc}</p>
        <div className="rs-final__actions">
          <Link className="rs-button rs-button--gold" href={`/${locale}/get-started`}>
            <span>{dict.web.finalCta}</span>
            <ArrowEnd className="rs-arrow" direction={direction} size={18} />
          </Link>
        </div>
      </div>
    </section>
  );
}
