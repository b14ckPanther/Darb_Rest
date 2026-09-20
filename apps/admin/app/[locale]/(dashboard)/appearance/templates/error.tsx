"use client";
import { useTranslation } from "@darb-rest/i18n";
export default function OperationsError({ reset }: { reset: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <p role="alert">{t("appearance.error")}</p>
      <button className="min-h-11 rounded-xl border px-4" onClick={reset}>
        {t("ordering.refresh")}
      </button>
    </div>
  );
}
