"use client";
import { useState } from "react";
import { commercialLabels, type SupportedLocale } from "@darb-rest/i18n";
import { saveWhatsapp } from "../lib/actions/whatsapp";
export function WhatsappSettings({
  locale,
  rows,
}: {
  locale: SupportedLocale;
  rows: { id: string | null; name: string; number: string }[];
}) {
  const L = commercialLabels[locale],
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <section className="mt-8 space-y-5 rounded-xl border bg-[var(--bg-surface)] p-6">
      <h2 className="text-xl font-bold">{L.whatsapp}</h2>
      <p>{L.whatsappHelp}</p>
      <p role="status">{message}</p>
      {rows.map((r) => (
        <form
          key={r.id ?? "business"}
          className="flex flex-wrap items-end gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            setBusy(true);
            const value = String(new FormData(e.currentTarget).get("number") ?? "");
            try {
              setMessage((await saveWhatsapp(r.id, value)) ? L.saved : L.error);
            } catch {
              setMessage(L.error);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="grid grow gap-2">
            {r.name}
            <input
              name="number"
              type="tel"
              dir="ltr"
              maxLength={16}
              defaultValue={r.number}
              className="min-h-12 rounded-lg border p-3"
            />
          </label>
          <button
            disabled={busy}
            className="min-h-12 rounded-lg bg-[var(--darb-green-deep)] px-5 text-white"
          >
            {L.save}
          </button>
        </form>
      ))}
    </section>
  );
}
