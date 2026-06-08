import { createHmac, timingSafeEqual } from "node:crypto";

const GITHUB_REFRESH_EVENTS = new Set(["push", "create", "delete", "release"]);

export function createGitHubWebhookHandler(options: {
  isEnabled?: () => boolean;
  getSecret?: () => string | undefined;
  refresh: () => Promise<void>;
}) {
  return async function handleGitHubWebhook(request: Request) {
    if (!options.isEnabled?.()) {
      return Response.json({ error: "Git source mode is not enabled." }, { status: 404 });
    }

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
  };
}

function verifyGitHubWebhookSignature(payload: string, signatureHeader: string | null, secret?: string) {
  if (!secret)
    throw new Error("Webhook secret is not configured.");

  if (!signatureHeader?.startsWith("sha256="))
    return false;

  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const actual = signatureHeader.slice("sha256=".length);

  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(actual, "hex"));
  } catch {
    return false;
  }
}
