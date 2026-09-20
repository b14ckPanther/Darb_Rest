"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@darb-rest/i18n";
import { canManageOrders, type TenantRole } from "@darb-rest/types";
import { recordRestaurantPayment } from "../../lib/actions/orders";
export function RestaurantPayment({
  payment,
  role,
}: {
  payment: { id: string; method: string; status: string; revision: number };
  role: TenantRole;
}) {
  const { t } = useTranslation(),
    router = useRouter();
  const [busy, start] = useTransition(),
    [error, setError] = useState(false);
  if (payment.method !== "restaurant" || payment.status !== "pending" || !canManageOrders(role))
    return null;
  return (
    <>
      <button
        className="min-h-11 rounded-xl border px-4 text-sm"
        disabled={busy}
        onClick={() => {
          if (!window.confirm(t("payments.confirmPaid"))) return;
          start(async () => {
            const ok = await recordRestaurantPayment(payment.id, payment.revision);
            setError(!ok);
            if (ok) router.refresh();
          });
        }}
      >
        {t("payments.recordPaid")}
      </button>
      {error && <p role="alert">{t("ordering.save_error")}</p>}
    </>
  );
}
