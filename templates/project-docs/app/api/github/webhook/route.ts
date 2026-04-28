import { refreshRuntimeSnapshot, verifyWebhookSignature } from "@scriptorium/site-runtime";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get("x-hub-signature-256");
  const event = request.headers.get("x-github-event");

  if (!verifyWebhookSignature(payload, signature)) {
    return Response.json({ error: "Invalid signature." }, { status: 401 });
  }

  if (event === "ping") {
    return Response.json({ ok: true, event: "ping" });
  }

  if (event && !["push", "create", "delete", "release"].includes(event)) {
    return Response.json({ ok: true, ignored: event });
  }

  await refreshRuntimeSnapshot();
  return Response.json({ ok: true, refreshed: true });
}
