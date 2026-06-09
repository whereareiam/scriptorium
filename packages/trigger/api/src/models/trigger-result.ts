export interface TriggerResult {
  kind: "accepted" | "ignored" | "failed";
  operation: "webhook" | "refresh_requested";
  event?: string;
  error?: {
    code: "SOURCE_DISABLED" | "INVALID_SIGNATURE";
    message: string;
  };
  status: number;
}
