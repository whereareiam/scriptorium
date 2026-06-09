import type { TriggerResult } from "./models/trigger-result";

export interface TriggerHandler {
  handle(request: Request): Promise<TriggerResult>;
}
