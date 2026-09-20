import { loadPublicMenu, guestDb } from "../../lib/guest-orders";
import { imageDerivative } from "../../lib/media-derivatives";
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const business = q.get("business") ?? "",
    branch = q.get("branch") ?? "",
    item = q.get("item") ?? "";
  if (
    !/^[a-z0-9-]{1,100}$/.test(business) ||
    !/^[a-z0-9-]{1,100}$/.test(branch) ||
    !/^[a-f0-9-]{36}$/.test(item)
  )
    return new Response(null, { status: 404 });
  const loaded = await loadPublicMenu(business, branch);
  const dish = loaded?.content.menu_items.find((i) => i.id === item);
  if (!loaded || !dish?.image_path || !dish.image_path.startsWith(`${loaded.business.id}/`))
    return new Response(null, { status: 404 });
  const width = Number(q.get("width") ?? 960);
  if (![480, 960, 1440].includes(width)) return new Response(null, { status: 400 });
  const body = await imageDerivative(`menu:${dish.image_path}`, width, async () => {
    const { data, error } = await guestDb().storage.from("menu-media").download(dish.image_path!);
    if (error || !data || data.size > 8 * 1024 * 1024) throw Error("media_unavailable");
    return data.arrayBuffer();
  }).catch(() => null);
  if (!body) return new Response(null, { status: 404 });
  return new Response(new Uint8Array(body), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
