import type { RuntimePhase } from "./runtime-phase";

export interface RuntimeReadinessStatus {
  phase: RuntimePhase;
  startedAt?: string;
  finishedAt?: string;
  lastSuccessfulPreparedAt?: string;
  activeGenerationId?: string;
  error?: string;
}
