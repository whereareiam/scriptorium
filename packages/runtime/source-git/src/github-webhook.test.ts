import { createHmac } from "node:crypto";
import { describe, expect, it } from "bun:test";
import { createGitHubWebhookHandler } from "./github-webhook";

describe("createGitHubWebhookHandler", () => {
  it("accepts ping events with a valid signature", async () => {
    const handler = createGitHubWebhookHandler({
      isEnabled: () => true,
      getSecret: () => "secret",
      refresh: async () => undefined
    });

    const payload = JSON.stringify({ zen: "pong" });
    const response = await handler(createSignedRequest(payload, "secret", "ping"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, event: "ping" });
  });

  it("triggers refresh for supported events", async () => {
    let refreshCount = 0;
    const handler = createGitHubWebhookHandler({
      isEnabled: () => true,
      getSecret: () => "secret",
      refresh: async () => {
        refreshCount += 1;
      }
    });

    const response = await handler(createSignedRequest(JSON.stringify({ ref: "refs/heads/dev" }), "secret", "push"));

    expect(response.status).toBe(200);
    expect(refreshCount).toBe(1);
    expect(await response.json()).toEqual({ ok: true, refreshed: true });
  });

  it("ignores unsupported events", async () => {
    let refreshCount = 0;
    const handler = createGitHubWebhookHandler({
      isEnabled: () => true,
      getSecret: () => "secret",
      refresh: async () => {
        refreshCount += 1;
      }
    });

    const response = await handler(createSignedRequest(JSON.stringify({}), "secret", "issues"));

    expect(response.status).toBe(200);
    expect(refreshCount).toBe(0);
    expect(await response.json()).toEqual({ ok: true, ignored: "issues" });
  });

  it("rejects invalid signatures", async () => {
    const handler = createGitHubWebhookHandler({
      isEnabled: () => true,
      getSecret: () => "secret",
      refresh: async () => undefined
    });

    const response = await handler(new Request("https://example.invalid/webhook", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-github-event": "push",
        "x-hub-signature-256": "sha256=deadbeef"
      },
      body: JSON.stringify({})
    }));

    expect(response.status).toBe(401);
  });
});

function createSignedRequest(payload: string, secret: string, event: string) {
  const signature = createHmac("sha256", secret).update(payload).digest("hex");

  return new Request("https://example.invalid/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-github-event": event,
      "x-hub-signature-256": `sha256=${signature}`
    },
    body: payload
  });
}
