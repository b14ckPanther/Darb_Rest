import sharp from "sharp";
import { contentContext } from "../../../lib/content/service";
import { canEditMenuContent } from "@darb-rest/types";
import { imageMetadataSchema } from "@darb-rest/validation";
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json({ error: "forbidden" }, { status: 403 });
  try {
    const ctx = await contentContext();
    if (!ctx || !canEditMenuContent(ctx.role))
      return Response.json({ error: "forbidden" }, { status: 403 });
    if (Number(request.headers.get("content-length") ?? 0) > 6 * 1024 * 1024)
      return Response.json({ error: "invalidImage" }, { status: 413 });
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
    const id = String(form.get("itemId"));
    const { data: item } = await ctx.db
      .from("menu_items")
      .select("id,image_path,updated_at")
      .eq("id", id)
      .eq("business_id", ctx.business.id)
      .single();
    if (!item) return Response.json({ error: "forbidden" }, { status: 403 });
    const file = form.get("image");
    let path: string | null = null;
    if (form.get("remove") !== "true") {
      if (!(file instanceof File) || file.size > 5 * 1024 * 1024)
        return Response.json({ error: "invalidImage" }, { status: 400 });
      const source = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 40000000 });
      const meta = await source.metadata();
      if (
        !["jpeg", "png", "webp"].includes(meta.format ?? "") ||
        !imageMetadataSchema.safeParse({
          type: file.type,
          size: file.size,
          width: meta.width,
          height: meta.height,
        }).success
      )
        return Response.json({ error: "invalidImage" }, { status: 400 });
      const buffer = await source
        .rotate()
        .resize({ width: 1400, height: 1400, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
      path = `businesses/${ctx.business.id}/menu-items/${id}/${crypto.randomUUID()}.webp`;
      const { error } = await ctx.db.storage
        .from("menu-media")
        .upload(path, buffer, { contentType: "image/webp", upsert: false });
      if (error) throw error;
    }
    const { data: updated, error } = await ctx.db
      .from("menu_items")
      .update({ image_path: path })
      .eq("id", id)
      .eq("business_id", ctx.business.id)
      .eq("updated_at", item.updated_at)
      .select("id");
    if (error || !updated?.length) {
      if (path) await ctx.db.storage.from("menu-media").remove([path]);
      throw error ?? Error("Update failed");
    }
    if (item.image_path) {
      const { error: cleanup } = await ctx.db.storage.from("menu-media").remove([item.image_path]);
      if (cleanup) console.error("Media cleanup requires retry", { itemId: id });
    }
    const signed = path
      ? await ctx.db.storage.from("menu-media").createSignedUrl(path, 3600)
      : null;
    return Response.json({ ok: true, path, url: signed?.data?.signedUrl ?? null });
  } catch {
    return Response.json({ error: "invalidImage" }, { status: 400 });
  }
}
