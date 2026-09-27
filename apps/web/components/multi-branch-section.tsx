import React from "react";
import { getDictionary, type SupportedLocale } from "@darb-rest/i18n";
import { IconClock, IconMapPin } from "@darb-rest/icons";
import { DoorwayOutline } from "./marketing/doorway";

/** Every location is another doorway on the same route, managed from one place. */
export function MultiBranchSection({ locale }: { locale: SupportedLocale }) {
  const dict = getDictionary(locale);
  const points = [
    { icon: <IconMapPin size={18} />, text: dict.web.branchPoint1 },
    { icon: <IconClock size={18} />, text: dict.web.branchPoint2 },
    { icon: <IconStore size={18} />, text: dict.web.branchPoint3 },
  ];

  return (
    <section className="rs-route rs-route--canvas rs-section" aria-labelledby="rs-branches-title">
      <div className="rs-rail rs-rail--waypoint" aria-hidden="true" />
      <div className="rs-shell rs-shell--railed rs-branches">
        <div>
          <h2 id="rs-branches-title" className="rs-heading">
            {dict.web.branchTitle}
          </h2>
          <p className="rs-lead">{dict.web.branchDesc}</p>
          <ul className="rs-points">
            {points.map((point) => (
              <li key={point.text}>
                {point.icon}
                <span>{point.text}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rs-doorways" aria-hidden="true">
          <DoorwayOutline lit />
          <DoorwayOutline />
          <DoorwayOutline />
          <DoorwayOutline />
        </div>
      </div>
    </section>
  );
}

function IconStore({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" />
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" />
      <path d="M2 7h20" />
      <path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7" />
    </svg>
  );
}
