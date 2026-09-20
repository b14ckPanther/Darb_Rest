"use client";

import React from "react";
import Link from "next/link";
import { useTranslation } from "@darb-rest/i18n";
import { Button, EmptyState } from "@darb-rest/ui";
import { IconWarning } from "@darb-rest/icons";

export default function AdminNotFound() {
  const { t, locale } = useTranslation();

  return (
    <div className="flex items-center justify-center p-12">
      <EmptyState
        icon={<IconWarning size={28} className="text-[var(--color-warning)]" />}
        title={t("emptyState.noDataTitle")}
        description={t("emptyState.noDataDesc")}
        action={
          <Link href={`/${locale}`}>
            <Button variant="primary">{t("navigation.overview")}</Button>
          </Link>
        }
      />
    </div>
  );
}
