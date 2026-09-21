const v1Dormant = () => true;
import { processPaymentWebhook } from "../../../../../lib/payments";
export const runtime = "nodejs";
export async function POST(request: Request, context: { params: Promise<{ provider: string }> }) {
  if (v1Dormant()) return new Response(null, { status: 404 });
  // Bound streamed bodies as well as Content-Length; do not log callback payloads.
  const reader = request.body?.getReader();
  if (!reader) return new Response(null, { status: 400 });
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 16384) {
        await reader.cancel();
        return new Response(null, { status: 413 });
      }
      chunks.push(value);
    }
    const raw = Buffer.concat(chunks).toString("utf8");
    const result = await processPaymentWebhook(
      (await context.params).provider,
      raw,
      request.headers,
    );
    return new Response(null, { status: result.status });
  } catch {
    return new Response(null, { status: 503 });
  }
}
