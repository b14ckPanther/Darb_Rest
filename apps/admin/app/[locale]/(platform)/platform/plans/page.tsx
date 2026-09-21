import { getDictionary, type SupportedLocale } from "@darb-rest/i18n";
import type { PublicCommercialPlan } from "@darb-rest/types";
import { requirePlatform, requireData } from "../../../../../lib/platform";
import { PlanEditor } from "../../../../../components/platform/plan-editor";
export default async function Plans({ params }: { params: Promise<{ locale: SupportedLocale }> }) {
  const { locale } = await params,
    { db } = await requirePlatform(locale),
    L = getDictionary(locale).platform;
  const rows = requireData(
    await db
      .from("plans")
      .select(
        "id,code,name,description,monthly_price_ils,yearly_price_ils,price_is_starting,is_active,display_order,public_features,billing_note,plan_entitlements(feature_key,enabled,limit_value)",
      )
      .in("code", ["starter", "pro", "business"])
      .order("display_order")
      .order("code"),
  );
  return (
    <>
      <h1 className="text-3xl font-bold">{L.plans}</h1>
      <div className="space-y-8">
        {(rows ?? []).map((p) => (
          <PlanEditor
            key={p.id}
            locale={locale}
            plan={
              { ...p, entitlements: p.plan_entitlements } as unknown as PublicCommercialPlan & {
                is_active: boolean;
              }
            }
          />
        ))}
      </div>
    </>
  );
}
