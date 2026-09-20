import sharp from "sharp";
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
    .select("id")
    .eq("id", path.split("/")[0]!)
    .eq("status", "active")
    .maybeSingle();
  if (!business.data || business.error) return new Response(null, { status: 404 });
  const image = await db.storage.from("restaurant-branding").download(path);
  if (image.error || !image.data) return new Response(null, { status: 404 });
  const width = Number(new URL(request.url).searchParams.get("width"));
  const body = [480, 960, 1440].includes(width)
    ? new Uint8Array(
        await sharp(Buffer.from(await image.data.arrayBuffer()))
          .resize({ width, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer(),
      )
    : image.data;
  return new Response(body, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
