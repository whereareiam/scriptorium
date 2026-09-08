import { createHmac, timingSafeEqual } from "node:crypto";

export const MAX_WEBHOOK_BYTES = 25 * 1024 * 1024;

/** Verify raw bytes incrementally without retaining a potentially large payload. */
export async function verifyWebhook(request: Request, secret: string, maxBytes = MAX_WEBHOOK_BYTES): Promise<"valid" | "invalid" | "too_large"> {
  const signature = request.headers.get("x-hub-signature-256");
  if (!signature || !/^sha256=[a-f\d]{64}$/i.test(signature)) return "invalid";
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > maxBytes) return "too_large";
  const hmac = createHmac("sha256", secret);
  const reader = request.body?.getReader();
  let received = 0;
  if (reader) {
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        received += chunk.value.byteLength;
        if (received > maxBytes) {
          await reader.cancel();
          return "too_large";
        }
        hmac.update(chunk.value);
      }
    } finally { reader.releaseLock(); }
  }
  return timingSafeEqual(hmac.digest(), Buffer.from(signature.slice(7), "hex")) ? "valid" : "invalid";
}
