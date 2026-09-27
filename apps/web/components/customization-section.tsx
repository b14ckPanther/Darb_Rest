import React from "react";
import { getDictionary, type SupportedLocale } from "@darb-rest/i18n";
import { doorwayFramePath, doorwayOpeningPath } from "./marketing/doorway";

/** Illustrative palettes only: the same menu structure dressed in three identities. */
const studies = [
  { ground: "#0f3326", line: "#daa64d", frame: "#0a2119" },
  { ground: "#f6efe2", line: "#b4553a", frame: "#e3d8c4" },
  { ground: "#24272d", line: "#e0a84a", frame: "#16181c" },
] as const;

function MenuStudy({ ground, line, frame }: (typeof studies)[number]) {
  return (
    <svg viewBox="0 0 64 96" aria-hidden="true" focusable="false">
      <path d={doorwayFramePath} fill={frame} className="rs-swatch__frame" />
      <path d={doorwayOpeningPath} fill={ground} />
      <g className="rs-swatch__line" stroke={line}>
        <circle cx="32" cy="43" r="3.4" />
        <path d="M25 51h14" />
        <path d="M17 58h6M26 58h6M35 58h6" opacity="0.7" />
        <path d="M17 66h20M17 74h16M17 82h22M17 90h14" opacity="0.8" />
        <path d="M44 66h3M44 74h3M44 82h3M44 90h3" />
      </g>
    </svg>
  );
}

export function CustomizationSection({ locale }: { locale: SupportedLocale }) {
  const dict = getDictionary(locale);
  const points = [
    dict.web.customizePoint1,
    dict.web.customizePoint2,
    dict.web.customizePoint3,
    dict.web.customizePoint4,
  ];

  return (
    <section id="restaurants" className="rs-place rs-section" aria-labelledby="rs-brand-title">
      <div className="rs-rail rs-rail--waypoint" aria-hidden="true" />
      <div className="rs-shell rs-shell--railed rs-brand">
        <div>
          <h2 id="rs-brand-title" className="rs-heading">
            {dict.web.customizeTitle}
          </h2>
          <p className="rs-lead">{dict.web.customizeDesc}</p>
          <ul className="rs-checks">
            {points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>
        <figure className="rs-brand__studies" style={{ margin: 0 }}>
          <div className="rs-swatches">
            {studies.map((study) => (
              <div className="rs-swatch" key={study.ground}>
                <MenuStudy {...study} />
              </div>
            ))}
          </div>
          <figcaption className="rs-brand__note">{dict.web.brandStudiesNote}</figcaption>
        </figure>
      </div>
    </section>
  );
}
