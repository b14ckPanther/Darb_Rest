"use client";
import { useTranslation } from "@darb-rest/i18n";
import { Button } from "@darb-rest/ui";
export default function ErrorPage({ reset }: { reset: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-5 py-12 text-center">
      <p role="alert">{t("tables.loadError")}</p>
      <Button onClick={reset}>{t("common.retry")}</Button>
    </div>
  );
}
