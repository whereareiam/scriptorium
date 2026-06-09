import type { RuntimeErrorState } from "../runtime-state";

export type OperationStateKind = "accepted" | "ignored" | "failed";

export interface OperationState {
  kind: OperationStateKind;
  operation: "webhook" | "refresh_requested";
  event?: string;
  error?: RuntimeErrorState;
}

export interface OperationResponse {
  state: OperationState;
}
