import { readFile } from "node:fs/promises";
import { getRuntimePaths, type RuntimePhase, type RuntimeReadiness, type RuntimeReadinessStatus } from "@scriptorium/runtime";

export interface PersistedState extends RuntimeReadinessStatus {
  instanceId?: string;
}

export async function readPersistedState() {
  try {
    const raw = await readFile(getRuntimePaths().stateFile, "utf8");
    return JSON.parse(raw) as PersistedState;
  } catch {
    return null;
  }
}

export function toRuntimeReadiness(state: PersistedState | null): RuntimeReadiness {
  const phase: RuntimePhase = state?.phase ?? "idle";

  return {
    ok: phase === "ready",
    status: {
      phase,
      startedAt: state?.startedAt,
      finishedAt: state?.finishedAt,
      lastSuccessfulPreparedAt: state?.lastSuccessfulPreparedAt,
      activeGenerationId: state?.activeGenerationId,
      error: state?.error
    }
  };
}
