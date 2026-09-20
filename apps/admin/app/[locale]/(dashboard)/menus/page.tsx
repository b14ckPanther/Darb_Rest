import { loadContent } from "../../../../lib/content/service";
import { ContentEditor } from "../../../../components/content/editor";
import { getDictionary, isValidLocale } from "@darb-rest/i18n";
export default async function MenusPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const dict = getDictionary(isValidLocale(locale) ? locale : "ar");
  const loaded = await loadContent();
  if (!loaded) return <p className="mx-auto max-w-xl py-16 text-center">{dict.content.connect}</p>;
  return <ContentEditor loaded={loaded} />;
}
