import { expect, test } from "bun:test";
import { createHmac } from "node:crypto";
import { verifyWebhook } from "./verify-webhook";

const signature = (body: string) => `sha256=${createHmac("sha256", "secret").update(body).digest("hex")}`;

test("validates the exact UTF-8 bytes and rejects changed payloads", async () => {
  const body = '{"text":"Documentation λ"}';
  for (const [payload, result] of [[body, "valid"], [body + " ", "invalid"]])
    expect(await verifyWebhook(new Request("http://localhost", { method: "POST", body: payload, headers: { "x-hub-signature-256": signature(body) } }), "secret")).toBe(result);
});

test("rejects missing or malformed signatures without reading the body", async () => {
  for (const sig of ["", "sha256=bad"]) {
    const request = new Request("http://localhost", { method: "POST", body: "payload", headers: { "x-hub-signature-256": sig } });
    expect(await verifyWebhook(request, "secret")).toBe("invalid");
    expect(request.bodyUsed).toBe(false);
  }
});

test("bounds both declared and streamed body sizes", async () => {
  const body = "long payload";
  for (const headers of [{}, { "content-length": "12" }]) {
    const request = new Request("http://localhost", { method: "POST", body, headers: { ...headers, "x-hub-signature-256": signature(body) } });
    expect(await verifyWebhook(request, "secret", 4)).toBe("too_large");
  }
});
