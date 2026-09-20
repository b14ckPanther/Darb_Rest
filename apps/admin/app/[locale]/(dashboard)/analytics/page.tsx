import { notFound } from "next/navigation";
import { getDictionary, isValidLocale } from "@darb-rest/i18n";
import { loadAnalytics } from "../../../../lib/analytics";
import { AnalyticsDashboard } from "../../../../components/analytics/dashboard";
export default async function AnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ from?: string; to?: string; branch?: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();
  const result = await loadAnalytics(await searchParams);
  const L = getDictionary(locale).analytics;
  if (result.error)
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">{L.title}</h1>
        <p role="alert">{L[result.error]}</p>
        <a className="underline" href={`/${locale}/analytics`}>
          {L.apply}
        </a>
      </div>
    );
  return (
    <AnalyticsDashboard
      locale={locale}
      report={result.report}
      from={result.from}
      to={result.to}
      branch={result.branch}
      locations={result.ctx.locations}
    />
  );
}
