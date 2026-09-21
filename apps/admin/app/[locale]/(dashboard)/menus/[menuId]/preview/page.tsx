import { publicOrigin } from "@darb-rest/config";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getDictionary, isValidLocale } from "@darb-rest/i18n";
import { MenuPreview } from "@darb-rest/ui";
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
              href={`${publicOrigin()}/${locale}/order/${loaded.business.slug}/${l.slug}`}
            >
              {dict.ordering.publicLink} · {l.name[locale] || l.name.en}
            </a>
          ))}
      </div>
      <MenuPreview
        data={loaded.content}
        images={loaded.images}
        locale={locale}
        business={loaded.business}
        locations={loaded.locations}
        branding={loaded.branding}
        labels={{ ...dict.content, previewNote: dict.content.previewNote }}
        initialMenuId={menuId}
      />
    </div>
  );
}
