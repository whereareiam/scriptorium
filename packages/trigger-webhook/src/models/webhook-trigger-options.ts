import type { RefreshAction } from "@scriptorium/trigger";

export interface WebhookTriggerOptions {
  refresh: RefreshAction;
  getSecret?: () => string | undefined;
}
