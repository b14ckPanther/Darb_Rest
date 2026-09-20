import sharp from "sharp";
import { contentContext } from "../../../lib/content/service";
import { canManageBranding, brandingPath } from "@darb-rest/types";
export async function GET(request: Request) {
  const ctx = await contentContext();
  const path = new URL(request.url).searchParams.get("path") ?? "";
  if (
    !ctx ||
    !canManageBranding(ctx.role) ||
    !brandingPath(`https://media.darb.invalid/branding/${path}`) ||
    !path.startsWith(`${ctx.business.id}/`)
  )
    return new Response(null, { status: 404 });
  const { data, error } = await ctx.db.storage.from("restaurant-branding").download(path);
  if (error || !data) return new Response(null, { status: 404 });
  const width = Number(new URL(request.url).searchParams.get("width"));
  const body = [480, 960, 1440].includes(width)
    ? new Uint8Array(
        await sharp(Buffer.from(await data.arrayBuffer()))
          .resize({ width, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toBuffer(),
      )
    : data;
  return new Response(body, {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json({ error: "unavailable" }, { status: 403 });
  try {
    const ctx = await contentContext();
    if (!ctx || !canManageBranding(ctx.role))
      return Response.json({ error: "unavailable" }, { status: 403 });
    // Bound actual streamed bytes too; Content-Length can be absent or untrusted.
    const reader = request.body?.getReader();
    if (!reader) return Response.json({ error: "invalidImage" }, { status: 400 });
    const chunks: Buffer[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 6 * 1024 * 1024) {
        await reader.cancel();
        return Response.json({ error: "invalidImage" }, { status: 413 });
      }
      chunks.push(Buffer.from(value));
    }
    const form = await new Response(new Uint8Array(Buffer.concat(chunks)), {
      headers: { "content-type": request.headers.get("content-type") ?? "" },
    }).formData();
    if (form.get("businessId") !== ctx.business.id)
      return Response.json({ error: "unavailable" }, { status: 403 });
    const kind = form.get("kind"),
      file = form.get("image");
    if (
      !["logo", "cover"].includes(String(kind)) ||
      !(file instanceof File) ||
      file.size > 5 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    )
      return Response.json({ error: "invalidImage" }, { status: 400 });
    const source = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 40000000 });
    const meta = await source.metadata();
    if (!["jpeg", "png", "webp"].includes(meta.format ?? "") || (meta.pages ?? 1) > 1)
      return Response.json({ error: "invalidImage" }, { status: 400 });
    const bytes = await source
      .rotate()
      .resize({
        width: kind === "logo" ? 512 : 1920,
        height: kind === "logo" ? 512 : 1280,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer();
    const path = `${ctx.business.id}/${crypto.randomUUID()}.webp`;
    const { error } = await ctx.db.storage
      .from("restaurant-branding")
      .upload(path, bytes, { contentType: "image/webp", upsert: false });
    if (error) return Response.json({ error: "error" }, { status: 503 });
    return Response.json({ ref: `https://media.darb.invalid/branding/${path}` });
  } catch {
    return Response.json({ error: "invalidImage" }, { status: 400 });
  }
}
