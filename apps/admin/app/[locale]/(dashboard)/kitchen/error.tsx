"use client";
import { useTranslation } from "@darb-rest/i18n";
export default function KitchenError({ reset }: { reset: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <p role="alert">{t("kitchen.unavailable")}</p>
      <button className="min-h-11 rounded-xl border px-4" onClick={reset}>
        {t("kitchen.refresh")}
      </button>
    </div>
  );
}
