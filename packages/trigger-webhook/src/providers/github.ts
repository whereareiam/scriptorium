import { createHmac, timingSafeEqual } from "node:crypto";
import type { WebhookTriggerOptions } from "../models/webhook-trigger-options";

const GITHUB_REFRESH_EVENTS = new Set(["push", "create", "delete", "release"]);

export function isGitHubWebhookRequest(request: Request) {
  return request.headers.has("x-github-event") || request.headers.has("x-hub-signature-256");
}

export async function handleGitHubWebhookRequest(request: Request, options: WebhookTriggerOptions) {
  const payload = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  const event = request.headers.get("x-github-event");

  if (!verifyGitHubWebhookSignature(payload, signature, options.getSecret?.())) {
    return Response.json({ error: "Invalid signature." }, { status: 401 });
  }

  if (event === "ping") {
    return Response.json({ ok: true, event: "ping" });
  }

  if (event && !GITHUB_REFRESH_EVENTS.has(event)) {
    return Response.json({ ok: true, ignored: event });
  }

  await options.refresh();
  return Response.json({ ok: true, refreshed: true });
}

function verifyGitHubWebhookSignature(payload: string, signatureHeader: string | null, secret?: string) {
  if (!secret) {
    throw new Error("Webhook secret is not configured.");
  }

  if (!signatureHeader?.startsWith("sha256=")) {
    return false;
  }

  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const actual = signatureHeader.slice("sha256=".length);

  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(actual, "hex"));
  } catch {
    return false;
  }
}
