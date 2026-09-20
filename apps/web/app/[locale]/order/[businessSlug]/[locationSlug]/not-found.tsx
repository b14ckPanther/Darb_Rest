"use client";
import { useTranslation } from "@darb-rest/i18n";
export default function MissingBranch() {
  const { t } = useTranslation();
  return (
    <main className="mx-auto max-w-lg p-8">
      <h1 className="text-xl font-semibold">{t("ordering.unavailable")}</h1>
    </main>
  );
}
