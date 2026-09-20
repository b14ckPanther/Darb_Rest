import { notFound } from "next/navigation";
import { loadContent } from "../../../../../lib/content/service";
import { ContentEditor } from "../../../../../components/content/editor";
export default async function MenuPage({ params }: { params: Promise<{ menuId: string }> }) {
  const { menuId } = await params;
  const loaded = await loadContent();
  if (!loaded || !loaded.content.menus.some((m) => m.id === menuId)) notFound();
  return <ContentEditor loaded={loaded} menuId={menuId} />;
}
