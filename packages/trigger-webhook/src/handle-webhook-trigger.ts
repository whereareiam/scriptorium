import type { WebhookTriggerOptions } from "./models/webhook-trigger-options";
import { handleGitHubWebhookRequest, isGitHubWebhookRequest } from "./providers/github";

export function createWebhookTriggerHandler(options: WebhookTriggerOptions) {
  return async function handleWebhookTrigger(request: Request) {
    if (isGitHubWebhookRequest(request))
      return handleGitHubWebhookRequest(request, options);

    return Response.json({ error: "Unsupported webhook provider." }, { status: 400 });
  };
}
