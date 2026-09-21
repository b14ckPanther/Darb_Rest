"use client";
import { useLayoutEffect, useRef, useState } from "react";
import styles from "./commercial-pricing.module.css";
import Link from "next/link";
import { commercialLabels, type SupportedLocale } from "@darb-rest/i18n";
import type { PublicCommercialPlan } from "@darb-rest/types";
export function CommercialPricing({
  plans,
  locale,
}: {
  plans: PublicCommercialPlan[];
  locale: SupportedLocale;
}) {
  const [annual, setAnnual] = useState(false),
    L = commercialLabels[locale];
  const root = useRef<HTMLDivElement>(null);
  const indicator = useRef<HTMLSpanElement>(null);
  const previous = useRef(annual);
  const previousPrices = useRef<string[]>([]);
  const rtl = locale !== "en";
  const position = annual !== rtl ? "translateX(100%)" : "translateX(0%)";
  useLayoutEffect(() => {
    const amounts = Array.from(root.current?.querySelectorAll<HTMLElement>("[data-amount]") ?? []);
    const oldPrices = previousPrices.current;
    previousPrices.current = amounts.map((el) => el.textContent ?? "");
    const oldAnnual = previous.current;
    previous.current = annual;
    if (oldAnnual === annual || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const animations: Animation[] = [];
    const ghosts: HTMLElement[] = [];
    const ease = "cubic-bezier(.16,1,.3,1)";
    const direction = annual ? 1 : -1;
    function play(el: Element, frames: Keyframe[], duration: number, delay = 0) {
      const animation = el.animate(frames, { duration, delay, easing: ease, fill: "backwards" });
      animations.push(animation);
      return animation;
    }
    if (indicator.current)
      play(
        indicator.current,
        [
          { transform: oldAnnual !== rtl ? "translateX(100%)" : "translateX(0%)" },
          { transform: position },
        ],
        620,
      );
    amounts.forEach((el, index) => {
      const card = el.closest<HTMLElement>("[data-plan]")!;
      // Only animate visible cards; scrolling to an off-screen plan always shows the final amount.
      const rect = card.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > innerHeight) return;
      const delay = Math.min(index * 55, 110);
      const old = el.cloneNode(true) as HTMLElement;
      old.removeAttribute("data-amount");
      old.setAttribute("aria-hidden", "true");
      old.textContent = oldPrices[index] ?? el.textContent;
      Object.assign(old.style, {
        position: "absolute",
        top: "0",
        left: rtl ? "auto" : "0",
        right: rtl ? "0" : "auto",
        pointerEvents: "none",
      });
      el.parentElement!.appendChild(old);
      ghosts.push(old);
      void play(
        old,
        [
          { opacity: 1, transform: "translateY(0) rotateX(0deg)", filter: "blur(0px)" },
          {
            opacity: 0,
            transform: `translateY(${-direction * 24}px) rotateX(${direction * 75}deg)`,
            filter: "blur(3px)",
          },
        ],
        360,
        delay,
      )
        .finished.then(() => old.remove())
        .catch(() => {});
      play(
        el,
        [
          {
            opacity: 0,
            transform: `translateY(${direction * 28}px) rotateX(${-direction * 75}deg)`,
            filter: "blur(3px)",
          },
          { opacity: 1, transform: "translateY(0) rotateX(0deg)", filter: "blur(0px)" },
        ],
        700,
        delay,
      );
      play(
        card,
        [
          { transform: "perspective(1200px) translateY(0) rotateX(0deg)" },
          {
            transform: `perspective(1200px) translateY(-5px) rotateX(${direction * 0.7}deg)`,
            offset: 0.3,
          },
          { transform: "perspective(1200px) translateY(0) rotateX(0deg)" },
        ],
        820,
        delay,
      );
      const period = card.querySelector<HTMLElement>("[data-period]");
      if (period)
        play(
          period,
          [
            { opacity: 0.2, transform: "translateY(5px)" },
            { opacity: 1, transform: "translateY(0)" },
          ],
          500,
          delay + 80,
        );
      const sheen = card.querySelector<HTMLElement>("[data-sheen]");
      if (sheen)
        play(
          sheen,
          [
            { transform: "translateX(-110%)", opacity: 0 },
            { opacity: 1, offset: 0.3 },
            { transform: "translateX(110%)", opacity: 0 },
          ],
          900,
          delay,
        );
    });
    // Rapid toggles and unmounts never leave an outdated amount or running animation behind.
    return () => {
      animations.forEach((a) => a.cancel());
      ghosts.forEach((el) => el.remove());
    };
  }, [annual, rtl, position, plans]);
  return (
    <div ref={root} className="space-y-10" data-billing={annual ? "yearly" : "monthly"}>
      <div className={styles.switch} role="group" aria-label={L.commercial}>
        <span
          ref={indicator}
          aria-hidden="true"
          className={styles.indicator}
          style={{ transform: position }}
        />
        {[false, true].map((y) => (
          <button
            key={String(y)}
            type="button"
            aria-pressed={annual === y}
            onClick={() => setAnnual(y)}
          >
            {y ? L.yearly : L.monthly}
          </button>
        ))}
      </div>
      {!plans.length && <p role="status">{L.unavailable}</p>}
      <div className="grid gap-6 lg:grid-cols-3">
        {plans.map((p) => (
          <article
            key={p.id}
            data-plan={p.code}
            className={`${styles.card} relative flex flex-col rounded-xl border p-6 sm:p-8 ${p.code === "pro" ? "border-[var(--darb-green-deep)] bg-[var(--warm-bone)] shadow-lg" : "bg-[var(--bg-surface)]"}`}
          >
            <span className={styles.sheen} aria-hidden="true">
              <span
                data-sheen
                className="absolute inset-0 bg-[linear-gradient(115deg,transparent_25%,#c397511c_45%,#ffffff80_50%,transparent_75%)] opacity-0"
              />
            </span>
            {p.code === "pro" && (
              <p className="mb-4 text-sm font-bold text-[var(--color-primary)]">{L.popular}</p>
            )}
            <h2 className="text-2xl font-bold">{p.name[locale] || p.name.en}</h2>
            <p className="my-4 text-sm leading-relaxed">
              {p.description?.[locale] || p.description?.en}
            </p>
            <p className="my-5">
              <span className="block text-sm">{p.price_is_starting ? L.from : "\u00a0"}</span>
              <span className={styles.price}>
                <strong data-amount dir="ltr" className={`${styles.amount} font-bold`}>
                  {new Intl.NumberFormat(locale, {
                    style: "currency",
                    currency: "ILS",
                    maximumFractionDigits: 2,
                  }).format(annual ? p.yearly_price_ils : p.monthly_price_ils)}
                </strong>
              </span>
              <span data-period className={styles.period}>
                {annual ? L.year : L.month}
              </span>
            </p>
            <ul className="mb-6 space-y-3 text-sm">
              {(p.public_features[locale] || p.public_features.en || []).map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
            <p className="mb-5 text-sm">{p.billing_note[locale] || p.billing_note.en}</p>
            <Link
              className={`${styles.cta} mt-auto flex min-h-12 items-center justify-center rounded-lg bg-[var(--darb-green-deep)] px-5 text-white`}
              href={`/${locale}/get-started?plan=${p.code}`}
            >
              {L.choose}
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
