"use client";

import React from "react";
import Link from "next/link";
import { useTranslation } from "@darb-rest/i18n";
import { Button, EmptyState } from "@darb-rest/ui";
import { IconWarning } from "@darb-rest/icons";

export default function NotFound() {
  const { t, locale } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <EmptyState
        icon={<IconWarning size={28} className="text-[var(--color-warning)]" />}
        title={t("emptyState.noDataTitle")}
        description={t("emptyState.noDataDesc")}
        action={
          <Link href={`/${locale}`}>
            <Button variant="primary">{t("navigation.home")}</Button>
          </Link>
        }
      />
    </div>
  );
}
