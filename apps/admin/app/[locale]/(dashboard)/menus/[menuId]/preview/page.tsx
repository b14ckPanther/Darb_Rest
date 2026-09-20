import { PRODUCTION_DOMAIN } from "@darb-rest/config";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getDictionary, isValidLocale } from "@darb-rest/i18n";
import { OrderingMenu } from "@darb-rest/ui";
import { canPlaceOrder, type OrderSummary } from "@darb-rest/types";
import { contentContext } from "../../../../../../lib/content/service";
import { saveOwnerOrder } from "../../../../../../lib/actions/orders";
import { loadContent } from "../../../../../../lib/content/service";
export default async function PreviewPage({
  params,
}: {
  params: Promise<{ menuId: string; locale: string }>;
}) {
  const { menuId, locale } = await params;
  if (!isValidLocale(locale)) notFound();
  const loaded = await loadContent();
  if (!loaded || !loaded.content.menus.some((m) => m.id === menuId)) notFound();
  const dict = getDictionary(locale);
  const ctx = await contentContext();
  const { data: draft } = ctx
    ? await ctx.db
        .from("orders")
        .select(
          "id,business_id,location_id,status,fulfillment_mode,customer_name,customer_phone,currency,subtotal_cents,revision,created_at,updated_at,cart",
        )
        .eq("business_id", loaded.business.id)
        .eq("created_by", ctx.user.id)
        .eq("status", "draft")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };
  return (
    <div className="space-y-5">
      <Link
        className="inline-flex min-h-11 items-center text-sm"
        href={`/${locale}/menus/${menuId}`}
      >
        {dict.content.back}
      </Link>
      <div className="flex flex-wrap gap-2">
        {loaded.locations
          .filter((l) =>
            loaded.content.menu_locations.some(
              (a) => a.menu_id === menuId && a.location_id === l.id && a.is_enabled,
            ),
          )
          .map((l) => (
            <a
              key={l.id}
              className="inline-flex min-h-11 items-center rounded-xl border px-4 text-sm"
              href={`${process.env.NEXT_PUBLIC_WEB_URL || (process.env.NODE_ENV === "production" ? "https://" + PRODUCTION_DOMAIN : "http://localhost:3000")}/${locale}/order/${loaded.business.slug}/${l.slug}`}
            >
              {dict.ordering.publicLink} · {l.name[locale] || l.name.en}
            </a>
          ))}
      </div>
      <OrderingMenu
        data={loaded.content}
        images={loaded.images}
        locale={locale}
        business={loaded.business}
        locations={loaded.locations}
        branding={loaded.branding}
        labels={{ ...dict.content, previewNote: dict.ordering.ownerNote }}
        initialMenuId={menuId}
        orderLabels={dict.ordering}
        initialOrder={draft as unknown as OrderSummary | null}
        persist={saveOwnerOrder}
        readOnly={!canPlaceOrder(loaded.role)}
        scope={`owner-cart:${ctx!.user.id}:${loaded.business.id}`}
      />
    </div>
  );
}
