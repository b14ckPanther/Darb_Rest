import sharp from "sharp";
// Immutable object paths only. Callers reauthorize publication before every cache lookup.
const cache = new Map<string, { bytes: Buffer; expires: number }>();
let size = 0;
export async function imageDerivative(
  path: string,
  width: number,
  loadInput: () => Promise<ArrayBuffer>,
) {
  const key = `${path}:${width}`;
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.bytes;
  if (hit) {
    size -= hit.bytes.length;
    cache.delete(key);
  }
  const bytes = await sharp(Buffer.from(await loadInput()), { limitInputPixels: 40000000 })
    .resize({ width, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  if (bytes.length <= 8 * 1024 * 1024) {
    while (size + bytes.length > 32 * 1024 * 1024 && cache.size) {
      const first = cache.keys().next().value!;
      size -= cache.get(first)!.bytes.length;
      cache.delete(first);
    }
    const prior = cache.get(key);
    if (prior) size -= prior.bytes.length;
    cache.set(key, { bytes, expires: Date.now() + 3600000 });
    size += bytes.length;
  }
  return bytes;
}
