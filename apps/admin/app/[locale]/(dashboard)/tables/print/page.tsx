import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getDictionary, isValidLocale } from "@darb-rest/i18n";
import { ContentText } from "@darb-rest/ui";
import { canManageTables } from "@darb-rest/types";
import { loadTables, qrUrl } from "../../../../../lib/tables/service";
import { PrintButton } from "../../../../../components/tables/print-button";
export const metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function PrintTables({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ location?: string; table?: string; page?: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();
  const query = await searchParams;
  const loaded = await loadTables(query.location);
  if (!loaded || !canManageTables(loaded.role)) notFound();
  const rows = loaded.tables.filter(
    (t) => t.is_active && loaded.tokens[t.id] && (!query.table || t.id === query.table),
  );
  if (!rows.length) notFound();
  const L = getDictionary(locale).tables;
  const page = Math.max(
    0,
    Math.min(Math.ceil(rows.length / 24) - 1, Math.floor(Number(query.page)) || 0),
  );
  const cards = await Promise.all(
    rows.slice(page * 24, page * 24 + 24).map(async (t) => ({
      ...t,
      url: qrUrl(locale, loaded.tokens[t.id]!),
      image: await QRCode.toDataURL(qrUrl(locale, loaded.tokens[t.id]!), {
        errorCorrectionLevel: "Q",
        margin: 4,
        width: 800,
      }),
    })),
  );
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3 print:hidden">
        <Link
          className="inline-flex min-h-11 items-center rounded-xl border px-4"
          href={`/${locale}/tables?location=${loaded.location.id}`}
        >
          {L.back}
        </Link>
        <PrintButton label={L.print} />
        {page > 0 && (
          <Link
            className="inline-flex min-h-11 items-center rounded-xl border px-4"
            href={`?location=${loaded.location.id}&page=${page - 1}`}
          >
            {L.previous}
          </Link>
        )}
        {(page + 1) * 24 < rows.length && (
          <Link
            className="inline-flex min-h-11 items-center rounded-xl border px-4"
            href={`?location=${loaded.location.id}&page=${page + 1}`}
          >
            {L.next}
          </Link>
        )}
        <p className="w-full text-sm text-[var(--fg-muted)]">{L.printNote}</p>
      </div>
      <div className="table-print grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((t) => (
          <article
            key={t.id}
            className="qr-card flex flex-col items-center rounded-3xl border bg-[#fcfaf5] p-7 text-center text-[#18362a]"
            style={{
              borderTopColor: loaded.branding?.primary_color ?? "#18362a",
              borderTopWidth: 6,
            }}
          >
            {loaded.branding?.logo_url && (
              <img
                src={loaded.branding.logo_url}
                alt=""
                referrerPolicy="no-referrer"
                className="mb-4 h-14 w-auto max-w-40 object-contain"
              />
            )}
            <h1 className="text-2xl font-bold">
              <ContentText value={loaded.business.name} locale={locale} />
            </h1>
            <p className="mt-2 text-sm">
              <ContentText value={loaded.location.name} locale={locale} />
            </p>
            <p className="mt-6 text-sm">{L.table}</p>
            <h2 className="text-3xl font-bold">
              <bdi>{t.name}</bdi>
            </h2>
            {t.area && (
              <p className="mt-1">
                <bdi>{t.area}</bdi>
              </p>
            )}
            <img
              src={t.image}
              width={800}
              height={800}
              className="mt-4 aspect-square w-full max-w-64 bg-white"
              alt={L.qrAlt}
            />
            <p className="mt-4 text-lg font-semibold">{L.scan}</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3 text-sm print:hidden">
              <a
                href={t.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center underline"
              >
                {L.openMenu}
              </a>
              <a
                className="inline-flex min-h-11 items-center underline"
                href={`/api/tables/${t.id}/qr?locale=${locale}&format=svg`}
              >
                {L.downloadSvg}
              </a>
              <a
                className="inline-flex min-h-11 items-center underline"
                href={`/api/tables/${t.id}/qr?locale=${locale}&format=png`}
              >
                {L.downloadPng}
              </a>
            </div>
          </article>
        ))}
      </div>
      <style>{`@media print { @page {size:A4; margin:10mm} body * {visibility:hidden!important} .table-print,.table-print * {visibility:visible!important} .table-print {position:absolute;inset:0 0 auto;display:grid;align-items:start;grid-template-columns:1fr 1fr;gap:8mm} .qr-card{break-inside:avoid;page-break-inside:avoid;border:1px solid #ccd5cf!important;border-top:5px solid #18362a!important;padding:6mm!important;border-radius:5mm!important} .qr-card img{max-width:50mm} .qr-card .print\\:hidden{display:none!important} }`}</style>
    </div>
  );
}
