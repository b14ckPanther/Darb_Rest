"use client";
import { useTranslation } from "@darb-rest/i18n";
export default function ErrorPage({ reset }: { reset: () => void }) {
  const { t } = useTranslation();
  return (
    <main className="mx-auto max-w-lg space-y-5 p-6">
      <p role="alert">{t("ordering.save_error")}</p>
      <button className="min-h-11 rounded-xl border px-5" onClick={reset}>
        {t("ordering.refresh")}
      </button>
    </main>
  );
}
