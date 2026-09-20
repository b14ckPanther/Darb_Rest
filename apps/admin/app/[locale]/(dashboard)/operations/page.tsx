import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getDictionary, isValidLocale } from "@darb-rest/i18n";
import { canManageOrders } from "@darb-rest/types";
import { ContentText } from "@darb-rest/ui";
import { COOKIE_KEYS } from "@darb-rest/config";
import { contentContext } from "../../../../lib/content/service";
import { OperationsWorkspace } from "../../../../components/operations/workspace";
export default async function OperationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ location?: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();
  const L = { ...getDictionary(locale).kitchen, ...getDictionary(locale).operations };
  const ctx = await contentContext();
  if (!ctx || !canManageOrders(ctx.role)) return <p role="alert">{L.unavailable}</p>;
  const { data: locations, error } = await ctx.db
    .from("locations")
    .select("id,name")
    .eq("business_id", ctx.business.id)
    .eq("status", "active")
    .order("created_at");
  if (error) throw error;
  const requested = (await searchParams).location;
  const chosen = requested ?? (await cookies()).get(COOKIE_KEYS.ACTIVE_LOCATION)?.value;
  const location = locations?.find((l) => l.id === chosen) ?? (!requested ? locations?.[0] : null);
  if (!location) notFound();
  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <header>
        <h1 className="text-3xl font-bold">{L.title}</h1>
        <p className="mt-2 text-[var(--fg-muted)]">{L.subtitle}</p>
      </header>
      <nav aria-label={L.branch} className="flex flex-wrap gap-2">
        {locations?.map((l) => (
          <Link
            key={l.id}
            href={`/${locale}/operations?location=${l.id}`}
            aria-current={l.id === location.id ? "page" : undefined}
            className="inline-flex min-h-11 items-center rounded-full border px-4 text-sm aria-[current=page]:bg-[var(--darb-green-deep)] aria-[current=page]:text-white"
          >
            <ContentText value={l.name as Record<string, string>} locale={locale} />
          </Link>
        ))}
      </nav>
      <OperationsWorkspace
        key={`${ctx.business.id}:${location.id}`}
        businessId={ctx.business.id}
        locationId={location.id}
      />
    </div>
  );
}
