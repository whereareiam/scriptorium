export interface TriggerResult {
  kind: "accepted" | "ignored" | "failed";
  operation: "webhook" | "refresh_requested";
  event?: string;
  error?: {
    code: "SOURCE_DISABLED" | "INVALID_SIGNATURE" | "PAYLOAD_TOO_LARGE";
    message: string;
  };
  status: number;
}
