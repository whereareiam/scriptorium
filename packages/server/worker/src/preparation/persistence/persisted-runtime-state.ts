import type { RuntimePhase } from "../model/runtime-phase";

export interface PersistedRuntimeState {
  instanceId: string;
  phase: RuntimePhase;
  startedAt?: string;
  finishedAt?: string;
  activeGenerationId?: string;
  lastSuccessfulPreparedAt?: string;
  error?: string;
}
