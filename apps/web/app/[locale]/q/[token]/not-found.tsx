"use client";
import { useTranslation } from "@darb-rest/i18n";
export default function InvalidQr() {
  const { t } = useTranslation();
  return (
    <main className="mx-auto max-w-lg px-5 py-20">
      <h1 className="text-3xl font-bold">{t("tables.invalidQr")}</h1>
      <p className="mt-4 text-[var(--fg-muted)]">{t("tables.invalidQrNote")}</p>
    </main>
  );
}
