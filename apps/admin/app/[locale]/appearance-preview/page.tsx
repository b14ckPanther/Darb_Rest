import { getDictionary, isValidLocale } from "@darb-rest/i18n";
import { notFound } from "next/navigation";
import { loadAppearance } from "../../../lib/appearance";
import { AppearancePreview } from "../../../components/appearance/preview";
export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };
export default async function PreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ branch?: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();
  const data = await loadAppearance();
  if (!data) notFound();
  const branch = (await searchParams).branch ?? data.locations[0]?.id;
  const location = data.locations.find((l) => l.id === branch);
  if (!location) notFound();
  const dict = getDictionary(locale);
  return (
    <AppearancePreview
      data={data.content}
      images={data.images}
      business={data.business}
      locations={[location]}
      locale={locale}
      labels={dict.content}
      restaurant={{
        settings: data.settings,
        profile: data.profiles[location.id]!,
        labels: dict.appearance,
      }}
    />
  );
}
