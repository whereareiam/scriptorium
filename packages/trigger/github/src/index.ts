import { verifyWebhook } from "./verify-webhook";
import type { WorkerService } from "@scriptorium/server-worker-api";
import type { TriggerHandler, TriggerResult } from "@scriptorium/trigger-api";

const GITHUB_REFRESH_EVENTS = new Set(["push", "create", "delete", "release"]);

export function createGitHubTriggerHandler(options: {
  secret?: string;
  workerService: WorkerService;
}): TriggerHandler {
  return {
    async handle(request) {
      if (!options.secret) throw new Error("Webhook secret is not configured.");
      const verification = await verifyWebhook(request, options.secret);
      const event = request.headers.get("x-github-event");

      if (verification === "too_large") {
        return {
          kind: "failed", operation: "webhook", status: 413,
          error: { code: "PAYLOAD_TOO_LARGE", message: "Webhook payload exceeds 25 MiB." }
        } satisfies TriggerResult;
      }

      if (verification !== "valid") {
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
