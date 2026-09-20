import { getDictionary, isValidLocale } from "@darb-rest/i18n";
import { notFound } from "next/navigation";
import { loadAppearance } from "../../../../../lib/appearance";
import { AppearanceEditor } from "../../../../../components/appearance/editor";
export default async function AppearancePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();
  const data = await loadAppearance();
  if (!data) return <p role="alert">{getDictionary(locale).appearance.unavailable}</p>;
  return (
    <AppearanceEditor
      settings={data.settings}
      published={data.published}
      revision={data.revision}
      locations={data.locations}
      businessSlug={data.business.slug}
      businessId={data.business.id}
      persistenceReady={data.persistenceReady}
    />
  );
}
