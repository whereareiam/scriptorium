import { createHmac, timingSafeEqual } from "node:crypto";
import type { WorkerService } from "@scriptorium/server-worker-api";
import type { TriggerHandler, TriggerResult } from "@scriptorium/trigger-api";

const GITHUB_REFRESH_EVENTS = new Set(["push", "create", "delete", "release"]);

export function createGitHubTriggerHandler(options: {
  secret?: string;
  workerService: WorkerService;
}): TriggerHandler {
  return {
    async handle(request) {
      const payload = await request.text();
      const signature = request.headers.get("x-hub-signature-256");
      const event = request.headers.get("x-github-event");

      if (!verifyGitHubWebhookSignature(payload, signature, options.secret)) {
        return {
          kind: "failed",
          operation: "webhook",
          error: {
            code: "INVALID_SIGNATURE",
            message: "Invalid signature."
          },
          status: 401
        } satisfies TriggerResult;
      }

      if (event === "ping") {
        return {
          kind: "accepted",
          operation: "webhook",
          event: "ping",
          status: 200
        } satisfies TriggerResult;
      }

      if (event && !GITHUB_REFRESH_EVENTS.has(event)) {
        return {
          kind: "ignored",
          operation: "webhook",
          event,
          status: 200
        } satisfies TriggerResult;
      }

      void options.workerService.requestPrepare({
        reason: "webhook",
        event: typeof event === "string" ? event : undefined
      }).catch(error => {
        console.error("Webhook preparation failed:", error);
      });

      return {
        kind: "accepted",
        operation: "refresh_requested",
        event: typeof event === "string" ? event : undefined,
        status: 202
      } satisfies TriggerResult;
    }
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
