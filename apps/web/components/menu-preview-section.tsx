import React from "react";
import { getDictionary, type SupportedLocale } from "@darb-rest/i18n";

/**
 * Menu anatomy: a line elevation of a guest menu page with numbered parts. It shows structure only;
 * no restaurant, dish, or price is depicted.
 */
export function MenuPreviewSection({ locale }: { locale: SupportedLocale }) {
  const dict = getDictionary(locale);
  const parts = [dict.web.menuPoint1, dict.web.menuPoint2, dict.web.menuPoint3];

  return (
    <section className="rs-route rs-section" aria-labelledby="rs-menu-title">
      <div className="rs-rail" aria-hidden="true" />
      <div className="rs-shell rs-shell--railed rs-anatomy">
        <div>
          <h2 id="rs-menu-title" className="rs-heading">
            {dict.web.menuTitle}
          </h2>
          <p className="rs-lead">{dict.web.menuDesc}</p>
          <ol className="rs-callouts">
            {parts.map((part) => (
              <li key={part}>{part}</li>
            ))}
          </ol>
        </div>
        <div className="rs-anatomy__drawing" aria-hidden="true">
          <svg viewBox="0 0 220 400" focusable="false">
            <rect className="rs-anatomy__phone" x="10" y="4" width="200" height="392" rx="22" />
            <circle className="rs-anatomy__ink" cx="46" cy="44" r="12" />
            <path className="rs-anatomy__ink" d="M66 40h70M66 50h44" />
            <rect className="rs-anatomy__fill" x="26" y="74" width="48" height="16" rx="2" />
            <path className="rs-anatomy__gold" d="M26 90h48" />
            <path className="rs-anatomy__ink" d="M84 82h36M130 82h36M176 82h18" />
            {[112, 184, 256].map((y) => (
              <g key={y}>
                <rect className="rs-anatomy__fill" x="26" y={y} width="52" height="52" rx="2" />
                <path
                  className="rs-anatomy__ink"
                  d={`M90 ${y + 10}h84M90 ${y + 22}h60M90 ${y + 34}h72`}
                />
                <path className="rs-anatomy__gold" d={`M166 ${y + 48}h28`} />
              </g>
            ))}
            <rect className="rs-anatomy__ink" x="146" y="330" width="34" height="18" rx="9" />
            <circle className="rs-anatomy__marker" cx="171" cy="339" r="6" />
            <path className="rs-anatomy__ink" d="M26 339h96" />
            <g>
              <circle className="rs-anatomy__marker" cx="214" cy="82" r="11" />
              <text className="rs-anatomy__marker-text" x="214" y="86" lang="en">
                1
              </text>
              <circle className="rs-anatomy__marker" cx="6" cy="138" r="11" />
              <text className="rs-anatomy__marker-text" x="6" y="142" lang="en">
                2
              </text>
              <circle className="rs-anatomy__marker" cx="214" cy="339" r="11" />
              <text className="rs-anatomy__marker-text" x="214" y="343" lang="en">
                3
              </text>
            </g>
          </svg>
        </div>
      </div>
    </section>
  );
}
