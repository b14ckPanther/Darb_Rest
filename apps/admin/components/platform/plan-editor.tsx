"use client";
import { useState } from "react";
import { commercialLabels, commercialFeatureLabels, type SupportedLocale } from "@darb-rest/i18n";
import { V1_FEATURE_FLAGS, type PublicCommercialPlan } from "@darb-rest/types";
import { saveCommercial } from "../../lib/actions/commercial";
export function PlanEditor({
  plan,
  locale,
}: {
  plan: PublicCommercialPlan & { is_active: boolean };
  locale: SupportedLocale;
}) {
  const L = commercialLabels[locale],
    [feedback, setFeedback] = useState(""),
    [busy, setBusy] = useState(false);
  const input = "min-h-11 w-full rounded-lg border bg-[var(--bg-surface)] p-3";
  async function submit(e: React.FormEvent<HTMLFormElement>, features = false) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setFeedback("");
    const d = new FormData(e.currentTarget);
    const localized = (key: string) =>
      Object.fromEntries(["en", "ar", "he"].map((l) => [l, d.get(`${key}.${l}`) || ""]));
    const raw = features
      ? {
          id: plan.id,
          features: V1_FEATURE_FLAGS.map((feature_key) => ({
            feature_key,
            enabled: d.get(feature_key) === "on",
            limit_value:
              feature_key === "multi_location" && d.get("limit") ? Number(d.get("limit")) : null,
          })),
        }
      : {
          id: plan.id,
          monthly_price_ils: d.get("monthly_price_ils"),
          yearly_price_ils: d.get("yearly_price_ils"),
          price_is_starting: d.get("price_is_starting") === "on",
          is_active: d.get("is_active") === "on",
          display_order: d.get("display_order"),
          description: localized("description"),
          billing_note: localized("billing_note"),
          public_features: Object.fromEntries(
            ["en", "ar", "he"].map((l) => [
              l,
              String(d.get(`public_features.${l}`) || "")
                .split("\n")
                .map((v) => v.trim())
                .filter(Boolean),
            ]),
          ),
        };
    try {
      setFeedback((await saveCommercial(locale, raw, features)) ? L.saved : L.error);
    } catch {
      setFeedback(L.error);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section id={plan.id} className="rounded-xl border bg-[var(--bg-surface)] p-5 sm:p-8">
      <h2 className="mb-6 text-2xl font-bold">{plan.name[locale] || plan.name.en}</h2>
      <p role="status">{feedback}</p>
      <form onSubmit={(e) => submit(e)} className="space-y-5">
        <h3 className="font-bold">{L.commercial}</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          {(["monthly_price_ils", "yearly_price_ils", "display_order"] as const).map((k, i) => (
            <label key={k} className="grid gap-2">
              {[L.monthlyPrice, L.yearlyPrice, L.order][i]}
              <input
                className={input}
                name={k}
                type="number"
                min="0"
                step={i === 2 ? "1" : "0.01"}
                required
                defaultValue={plan[k]}
              />
            </label>
          ))}
        </div>
        <div className="flex flex-wrap gap-6">
          {(["price_is_starting", "is_active"] as const).map((k, i) => (
            <label key={k} className="flex min-h-11 items-center gap-3">
              <input type="checkbox" name={k} defaultChecked={plan[k]} />
              {i ? L.active : L.starting}
            </label>
          ))}
        </div>
        {["en", "ar", "he"].map((l) => (
          <fieldset key={l} className="grid gap-4 border-t pt-4 sm:grid-cols-3">
            <legend lang="en">{l.toUpperCase()}</legend>
            {(["description", "public_features", "billing_note"] as const).map((k, i) => (
              <label key={k} className="grid gap-2">
                {[L.description, L.features, L.note][i]}
                <textarea
                  lang={l}
                  dir={l === "en" ? "ltr" : "rtl"}
                  name={`${k}.${l}`}
                  className={input}
                  rows={i === 1 ? 7 : 3}
                  maxLength={i === 1 ? 2010 : 1000}
                  defaultValue={
                    k === "public_features"
                      ? plan.public_features[l]?.join("\n")
                      : plan[k]?.[l] || ""
                  }
                />
              </label>
            ))}
          </fieldset>
        ))}
        <button
          disabled={busy}
          className="min-h-11 rounded-lg bg-[var(--darb-green-deep)] px-6 text-white"
        >
          {L.save}
        </button>
      </form>
      <form onSubmit={(e) => submit(e, true)} className="mt-10 space-y-4 border-t pt-6">
        <h3 className="font-bold">{L.entitlements}</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {V1_FEATURE_FLAGS.map((key) => (
            <label key={key} className="flex min-h-11 items-center gap-3">
              <input
                name={key}
                type="checkbox"
                defaultChecked={plan.entitlements.find((e) => e.feature_key === key)?.enabled}
              />
              <span>{commercialFeatureLabels[locale][key]}</span>
            </label>
          ))}
        </div>
        <label className="grid max-w-xs gap-2">
          {L.limit}
          <input
            className={input}
            type="number"
            min="1"
            name="limit"
            defaultValue={
              plan.entitlements.find((e) => e.feature_key === "multi_location")?.limit_value ?? ""
            }
          />
        </label>
        <button
          disabled={busy}
          className="min-h-11 rounded-lg bg-[var(--darb-green-deep)] px-6 text-white"
        >
          {L.save}
        </button>
      </form>
    </section>
  );
}
