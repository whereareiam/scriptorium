export type RuntimePhase = "idle" | "bundling" | "preparing-content" | "preparing-search" | "ready" | "error";

export type RuntimeStateKind = "ready" | "refreshing" | "starting" | "failed";

export interface RuntimeContentState {
  token: string;
  preparedAt: string;
}

export interface RuntimeErrorState {
  code: "PREPARATION_FAILED" | "SOURCE_DISABLED" | "INVALID_SIGNATURE" | "UNKNOWN_REF";
  message: string;
}

export interface RuntimeState {
  kind: RuntimeStateKind;
  content?: RuntimeContentState;
  error?: RuntimeErrorState;
}

export interface ReadinessResponse {
  state: RuntimeState;
  phase: RuntimePhase;
}

export function hasUsableContent(readiness: ReadinessResponse) {
  return readiness.state.kind === "ready" || readiness.state.kind === "refreshing";
}
