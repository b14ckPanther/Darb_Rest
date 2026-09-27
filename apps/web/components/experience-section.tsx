import React from "react";
import { getDictionary, type SupportedLocale } from "@darb-rest/i18n";

/** From setup to service: five stops on one route. The sequence is the content. */
export function ExperienceSection({ locale }: { locale: SupportedLocale }) {
  const dict = getDictionary(locale);
  const steps = [
    { title: dict.web.step1Title, desc: dict.web.step1Desc },
    { title: dict.web.step2Title, desc: dict.web.step2Desc },
    { title: dict.web.step3Title, desc: dict.web.step3Desc },
    { title: dict.web.step4Title, desc: dict.web.step4Desc },
    { title: dict.web.step5Title, desc: dict.web.step5Desc },
  ];

  return (
    <section
      id="product"
      className="rs-route rs-route--canvas rs-section"
      aria-labelledby="rs-steps-title"
    >
      <div className="rs-rail rs-rail--waypoint" aria-hidden="true" />
      <div className="rs-shell rs-shell--railed">
        <h2 id="rs-steps-title" className="rs-heading">
          {dict.web.experienceTitle}
        </h2>
        <p className="rs-lead">{dict.web.experienceSubtitle}</p>
        <ol className="rs-stops">
          {steps.map((step, index) => (
            <li key={step.title}>
              <span className="rs-stop__number" aria-hidden="true" lang="en" dir="ltr">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
