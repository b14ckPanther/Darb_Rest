"use client";
import { useState } from "react";
import { activationLabels, getDictionary, type SupportedLocale } from "@darb-rest/i18n";
import { ActionButton } from "./platform/commercial-approval";
export function PasswordFields({ locale }: { locale: SupportedLocale }) {
  const L = activationLabels[locale],
    D = getDictionary(locale),
    [visible, setVisible] = useState(false);
  return (
    <>
      <label className="grid gap-2">
        {L.password}
        <input
          required
          type={visible ? "text" : "password"}
          name="password"
          minLength={12}
          maxLength={128}
          autoComplete="new-password"
          className="min-h-12 w-full rounded-lg border bg-white px-3 text-base"
          dir="ltr"
        />
      </label>
      <label className="grid gap-2">
        {L.confirmPassword}
        <input
          required
          type={visible ? "text" : "password"}
          name="confirmPassword"
          minLength={12}
          maxLength={128}
          autoComplete="new-password"
          className="min-h-12 w-full rounded-lg border bg-white px-3 text-base"
          dir="ltr"
        />
      </label>
      <button
        type="button"
        aria-pressed={visible}
        onClick={() => setVisible(!visible)}
        className="min-h-11 text-start text-sm underline"
      >
        {visible ? D.auth.hidePassword : D.auth.showPassword}
      </button>
      <p className="text-sm text-[var(--fg-muted)]">{L.passwordHelp}</p>
    </>
  );
}
export function AccountSubmit({ label }: { label: string }) {
  return <ActionButton label={label} />;
}
