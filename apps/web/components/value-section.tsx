import React from "react";
import { getDictionary, type SupportedLocale } from "@darb-rest/i18n";

/** Why Darb REST: four signed waypoints along the route. */
export function ValueSection({ locale }: { locale: SupportedLocale }) {
  const dict = getDictionary(locale);
  const values = [
    { title: dict.web.value1Title, desc: dict.web.value1Desc },
    { title: dict.web.value2Title, desc: dict.web.value2Desc },
    { title: dict.web.value3Title, desc: dict.web.value3Desc },
    { title: dict.web.value4Title, desc: dict.web.value4Desc },
  ];

  return (
    <section className="rs-route rs-section" aria-labelledby="rs-values-title">
      <div className="rs-rail rs-rail--waypoint" aria-hidden="true" />
      <div className="rs-shell rs-shell--railed">
        <div className="rs-values__intro">
          <h2 id="rs-values-title" className="rs-heading">
            {dict.web.valueTitle}
          </h2>
          <p className="rs-lead">{dict.web.valueSubtitle}</p>
        </div>
        <ul className="rs-signs">
          {values.map((item) => (
            <li key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
