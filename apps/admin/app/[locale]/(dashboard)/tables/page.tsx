import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary, isValidLocale } from "@darb-rest/i18n";
import { ContentText } from "@darb-rest/ui";
import { canManageTables } from "@darb-rest/types";
import { loadTables } from "../../../../lib/tables/service";
import { TableManager } from "../../../../components/tables/table-manager";
export default async function TablesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ location?: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();
  const loaded = await loadTables((await searchParams).location);
  if (!loaded) notFound();
  const L = getDictionary(locale).tables;
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header>
        <h1 className="text-3xl font-bold">{L.title}</h1>
        <p className="mt-2 text-[var(--fg-muted)]">{L.subtitle}</p>
      </header>
      <nav aria-label={L.branch} className="flex flex-wrap gap-2">
        {loaded.locations.map((l) => (
          <Link
            key={l.id}
            aria-current={l.id === loaded.location.id ? "page" : undefined}
            className="inline-flex min-h-11 items-center rounded-full border px-4 text-sm aria-[current=page]:bg-[var(--bg-muted)]"
            href={`/${locale}/tables?location=${l.id}`}
          >
            <ContentText value={l.name} locale={locale} />
          </Link>
        ))}
      </nav>
      {canManageTables(loaded.role) &&
        loaded.tables.some((t) => t.is_active && loaded.tokens[t.id]) && (
          <Link
            className="inline-flex min-h-11 items-center rounded-xl border px-4 text-sm"
            href={`/${locale}/tables/print?location=${loaded.location.id}`}
          >
            {L.printAll}
          </Link>
        )}
      <TableManager
        key={loaded.location.id}
        tables={loaded.tables}
        locationId={loaded.location.id}
        editable={canManageTables(loaded.role)}
        qrIds={Object.keys(loaded.tokens)}
      />
    </div>
  );
}
