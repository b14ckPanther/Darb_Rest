import { getDictionary, type SupportedLocale } from "@darb-rest/i18n";
import { requirePlatform, platformPage } from "../../../../../lib/platform";
import { BusinessList } from "../../../../../components/platform/business-list";
export default async function Businesses({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale as SupportedLocale;
  await requirePlatform(locale);
  const q = await searchParams,
    L = getDictionary(locale).platform;
  return (
    <>
      <h1 className="text-3xl font-bold">{L.businesses}</h1>
      <form className="flex gap-3">
        <input
          name="q"
          defaultValue={q.q?.slice(0, 100)}
          maxLength={100}
          aria-label={L.search}
          className="min-w-0 flex-1 rounded-lg border p-3"
        />
        <button className="rounded-lg bg-[var(--darb-green-deep)] px-5 text-white">
          {L.search}
        </button>
      </form>
      <BusinessList locale={locale} page={platformPage(q.page)} search={q.q} />
    </>
  );
}
