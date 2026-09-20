"use client";

import React from "react";
import { useTranslation } from "@darb-rest/i18n";
import { Button, EmptyState } from "@darb-rest/ui";
import { IconWarning } from "@darb-rest/icons";

export default function AdminError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-center p-12">
      <EmptyState
        icon={<IconWarning size={28} className="text-[var(--color-destructive)]" />}
        title={t("common.error")}
        description={t("emptyState.noDataDesc")}
        action={
          <Button variant="primary" onClick={() => reset()}>
            {t("common.retry")}
          </Button>
        }
      />
    </div>
  );
}
