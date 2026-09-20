import { imageDerivative } from "../../lib/media-derivatives";
import { assertPublicBusiness } from "../../lib/launch";
import { brandingPath } from "@darb-rest/types";
import { guestDb } from "../../lib/guest-orders";
export async function GET(request: Request) {
  const path = new URL(request.url).searchParams.get("path") ?? "";
  const ref = `https://media.darb.invalid/branding/${path}`;
  if (!brandingPath(ref)) return new Response(null, { status: 404 });
  const db = guestDb();
  const { data, error } = await db
    .from("restaurant_appearance")
    .select("published")
    .eq("business_id", path.split("/")[0]!)
    .maybeSingle();
  const p = data?.published as { logo?: string; cover?: string } | null;
  if (error || !p || (p.logo !== ref && p.cover !== ref))
    return new Response(null, { status: 404 });
  const business = await db
    .from("businesses")
    .select("id,slug")
    .eq("id", path.split("/")[0]!)
    .eq("status", "active")
    .maybeSingle();
  if (!business.data || business.error) return new Response(null, { status: 404 });
  if (!(await assertPublicBusiness(business.data.slug))) return new Response(null, { status: 404 });
  const width = Number(new URL(request.url).searchParams.get("width") ?? 960);
  if (![480, 960, 1440].includes(width)) return new Response(null, { status: 400 });
  const derivative = await imageDerivative(path, width, async () => {
    const image = await db.storage.from("restaurant-branding").download(path);
    if (image.error || !image.data || image.data.size > 8 * 1024 * 1024)
      throw Error("media_unavailable");
    return image.data.arrayBuffer();
  }).catch(() => null);
  if (!derivative) return new Response(null, { status: 404 });
  const body = new Uint8Array(derivative);
  return new Response(body, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
