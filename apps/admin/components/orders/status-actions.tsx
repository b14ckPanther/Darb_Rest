"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@darb-rest/i18n";
import {
  nextOrderStatuses,
  canManageOrders,
  type OrderStatus,
  type TenantRole,
} from "@darb-rest/types";
import { changeOrderStatus } from "../../lib/actions/orders";
export function StatusActions({
  id,
  status,
  revision,
  role,
}: {
  id: string;
  status: OrderStatus;
  revision: number;
  role: TenantRole;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const [busy, start] = useTransition();
  const [error, setError] = useState("");
  const L = (k: string) => t(`ordering.${k}` as Parameters<typeof t>[0]);
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {canManageOrders(role) &&
          nextOrderStatuses[status].map((next) => (
            <button
              key={next}
              disabled={busy}
              className="min-h-11 rounded-xl border px-4 text-sm"
              onClick={() => {
                if (next === "cancelled" && !window.confirm(L("confirmCancel"))) return;
                start(async () => {
                  const r = await changeOrderStatus({ id, revision, status: next });
                  if (!r.ok) setError(L(r.error!));
                  else {
                    setError("");
                    router.refresh();
                  }
                });
              }}
            >
              {L(next)}
            </button>
          ))}
        <button
          disabled={busy}
          className="min-h-11 rounded-xl border px-4 text-sm"
          onClick={() => router.refresh()}
        >
          {L("refresh")}
        </button>
      </div>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
