"use client";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { activationLabels, type SupportedLocale } from "@darb-rest/i18n";
import { commercialAction } from "../../lib/actions/customer-activation";
type Plan = {
  id: string;
  name: Record<string, string>;
  monthly_price_ils: number;
  yearly_price_ils: number;
  price_is_starting: boolean;
};
export function ActionButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      aria-busy={pending}
      className="min-h-12 rounded-lg bg-[var(--darb-green-deep)] px-6 py-3 font-semibold text-white disabled:opacity-50"
    >
      {label}
    </button>
  );
}
export function CommercialApproval({
  plans,
  id,
  locale,
  selected,
}: {
  plans: Plan[];
  id: string;
  locale: SupportedLocale;
  selected?: string;
}) {
  const L = activationLabels[locale],
    [planId, setPlan] = useState(selected || plans[0]?.id || ""),
    [cycle, setCycle] = useState<"monthly" | "yearly">("monthly"),
    [override, setOverride] = useState<string | null>(null);
  const plan = plans.find((p) => p.id === planId);
  const amount =
    override ??
    String(plan?.[cycle === "monthly" ? "monthly_price_ils" : "yearly_price_ils"] ?? "");
  return (
    <form action={commercialAction} className="grid gap-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="action" value="approve" />
      <label className="grid gap-2">
        {L.plan}
        <select
          name="plan"
          value={planId}
          onChange={(e) => {
            setPlan(e.target.value);
            setOverride(null);
          }}
          className="min-h-12 rounded-lg border bg-white px-3"
        >
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name[locale] || p.name.en}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-2">
        {L.cycle}
        <select
          name="cycle"
          value={cycle}
          onChange={(e) => {
            setCycle(e.target.value as "monthly" | "yearly");
            setOverride(null);
          }}
          className="min-h-12 rounded-lg border bg-white px-3"
        >
          <option value="monthly">{L.monthly}</option>
          <option value="yearly">{L.yearly}</option>
        </select>
      </label>
      <label className="grid gap-2">
        {L.amount}
        <input
          name="amount"
          type="number"
          required
          min="0.01"
          step="0.01"
          max="999999999.99"
          value={amount}
          onChange={(e) => setOverride(e.target.value)}
          className="min-h-12 rounded-lg border bg-white px-3"
        />
      </label>
      <label className="flex min-h-11 items-center gap-3">
        <input name="confirmed" type="checkbox" required />
        {L.starting}
      </label>
      <ActionButton label={L.approve} />
    </form>
  );
}
