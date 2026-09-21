"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { commercialLabels, getDictionary, type SupportedLocale } from "@darb-rest/i18n";
import { IconCheck } from "@darb-rest/icons";
import { submitAcquisition } from "../lib/acquisition-actions";

export function AcquisitionForm({
  locale,
  plan = "unsure",
  kind = "application",
  plans = [],
}: {
  locale: SupportedLocale;
  plans?: import("@darb-rest/types").PublicCommercialPlan[];
  plan?: string;
  kind?: "application" | "inquiry";
}) {
  const L = getDictionary(locale).acquisition;
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [fields, setFields] = useState<string[]>([]);
  const lock = useRef(false);
  const feedback = useRef<HTMLDivElement>(null);
  const inquiry = kind === "inquiry";
  const control =
    "w-full min-h-12 rounded-lg border border-[var(--border-default)] bg-white px-4 py-3 text-base text-[var(--fg-default)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] aria-invalid:border-red-600";
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setState("loading");
    setFields([]);
    const form = event.currentTarget;
    try {
      const result = await submitAcquisition({
        ...Object.fromEntries(new FormData(form)),
        kind,
        locale,
      });
      setFields(result.fields ?? []);
      setState(result.ok ? "success" : "error");
      requestAnimationFrame(() => {
        if (!result.ok && result.fields?.length)
          form.querySelector<HTMLElement>(`[name="${result.fields[0]}"]`)?.focus();
        else feedback.current?.focus();
      });
    } catch {
      setState("error");
      requestAnimationFrame(() => feedback.current?.focus());
    } finally {
      lock.current = false;
    }
  }
  if (state === "success")
    return (
      <div
        ref={feedback}
        tabIndex={-1}
        role="status"
        className="rounded-xl bg-[var(--darb-green-deep)] p-7 text-white sm:p-10"
      >
        <IconCheck size={32} />
        <h2 className="mt-5 text-2xl font-bold">{inquiry ? L.contactSuccess : L.success}</h2>
        <p className="mt-4 leading-relaxed text-white/80">
          {inquiry ? L.contactSuccessBody : L.successBody}
        </p>
      </div>
    );
  const input = (
    name: "full_name" | "business_name" | "email" | "phone" | "city" | "branch_count",
    type = "text",
    optional = false,
  ) => (
    <label className="grid gap-2 text-sm font-semibold" key={name}>
      <span>
        {L[name]}
        {optional && (
          <span className="ms-2 font-normal text-[var(--fg-muted)]">({L.optional})</span>
        )}
      </span>
      <input
        className={control}
        name={name}
        type={type}
        required={!optional}
        maxLength={
          name === "email" ? 254 : name === "phone" ? 40 : name === "business_name" ? 160 : 120
        }
        min={type === "number" ? 1 : undefined}
        max={type === "number" ? 10000 : undefined}
        defaultValue={type === "number" ? 1 : undefined}
        autoComplete={
          {
            full_name: "name",
            email: "email",
            phone: "tel",
            city: "address-level2",
            business_name: "organization",
            branch_count: "off",
          }[name]
        }
        dir={type === "email" || type === "tel" || type === "number" ? "ltr" : "auto"}
        aria-invalid={fields.includes(name)}
        aria-describedby={fields.includes(name) ? `${name}-error` : undefined}
      />
      {fields.includes(name) && (
        <span id={`${name}-error`} className="text-red-700">
          {L.invalidField}
        </span>
      )}
    </label>
  );
  return (
    <form onSubmit={submit} className="space-y-6" aria-busy={state === "loading"}>
      <p className="text-sm text-[var(--fg-muted)]">{L.required}</p>
      <div className="grid gap-5 sm:grid-cols-2">
        {input("full_name")}
        {input("business_name")}
        {input("email", "email")}
        {input("phone", "tel", inquiry)}
        {!inquiry && (
          <>
            {input("city")}
            {input("branch_count", "number")}
            <label className="grid gap-2 text-sm font-semibold">
              {L.business_type}
              <select name="business_type" className={control} required>
                <option value="restaurant">{L.restaurant}</option>
                <option value="cafe">{L.cafe}</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              {L.requested_plan_code}
              <select name="requested_plan_code" className={control} defaultValue={plan}>
                <option value="unsure">{L.unsure}</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.code}>
                    {p.name[locale] || p.name.en} ·{" "}
                    {p.price_is_starting ? commercialLabels[locale].from + " " : ""}
                    {new Intl.NumberFormat(locale, { style: "currency", currency: "ILS" }).format(
                      p.monthly_price_ils,
                    )}{" "}
                    / {commercialLabels[locale].monthly}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}
      </div>
      <label className="grid gap-2 text-sm font-semibold">
        <span>
          {L.message}{" "}
          {!inquiry && <span className="font-normal text-[var(--fg-muted)]">({L.optional})</span>}
        </span>
        <textarea
          name="message"
          dir="auto"
          rows={3}
          maxLength={2000}
          required={inquiry}
          className={control}
          aria-invalid={fields.includes("message")}
        />
      </label>
      {state === "error" && (
        <div
          ref={feedback}
          tabIndex={-1}
          role="alert"
          className="rounded-lg bg-red-50 p-4 text-sm text-red-800"
        >
          {fields.length ? L.invalid : L.error}
        </div>
      )}
      <button
        disabled={state === "loading"}
        className="min-h-12 w-full rounded-lg bg-[var(--darb-green-deep)] px-6 py-3 font-semibold text-white transition-colors hover:bg-[var(--darb-green-mid)] focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:opacity-60"
      >
        {state === "loading" ? L.sending : L.submit}
      </button>
      <p className="text-xs leading-relaxed text-[var(--fg-muted)]">
        {L.privacy}{" "}
        <Link className="underline" href={`/${locale}/privacy`}>
          {L.privacyLink}
        </Link>
      </p>
    </form>
  );
}
