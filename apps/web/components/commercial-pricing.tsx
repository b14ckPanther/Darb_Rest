"use client";
import { useState } from "react";
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
  return (
    <div className="space-y-8">
      <div className="flex justify-center gap-2" role="group" aria-label={L.commercial}>
        {[false, true].map((y) => (
          <button
            key={String(y)}
            type="button"
            aria-pressed={annual === y}
            onClick={() => setAnnual(y)}
            className={`min-h-12 rounded-lg px-6 ${annual === y ? "bg-[var(--darb-green-deep)] text-white" : "bg-[var(--warm-bone)]"}`}
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
            className={`relative flex flex-col rounded-xl border p-6 sm:p-8 ${p.code === "pro" ? "border-[var(--darb-green-deep)] bg-[var(--warm-bone)] shadow-lg" : "bg-[var(--bg-surface)]"}`}
          >
            {p.code === "pro" && (
              <p className="mb-4 text-sm font-bold text-[var(--color-primary)]">{L.popular}</p>
            )}
            <h2 className="text-2xl font-bold">{p.name[locale] || p.name.en}</h2>
            <p className="my-4 text-sm leading-relaxed">
              {p.description?.[locale] || p.description?.en}
            </p>
            <p className="my-5">
              <span className="block text-sm">{p.price_is_starting ? L.from : "\u00a0"}</span>
              <strong dir="ltr" className="inline-block text-4xl font-bold">
                {new Intl.NumberFormat(locale, {
                  style: "currency",
                  currency: "ILS",
                  maximumFractionDigits: 2,
                }).format(annual ? p.yearly_price_ils : p.monthly_price_ils)}
              </strong>{" "}
              <span>{annual ? L.year : L.month}</span>
            </p>
            <ul className="mb-6 space-y-3 text-sm">
              {(p.public_features[locale] || p.public_features.en || []).map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
            <p className="mb-5 text-sm">{p.billing_note[locale] || p.billing_note.en}</p>
            <Link
              className="mt-auto flex min-h-12 items-center justify-center rounded-lg bg-[var(--darb-green-deep)] px-5 text-white"
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
