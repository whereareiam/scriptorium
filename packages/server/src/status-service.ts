import { readFile } from "node:fs/promises";
import type {
  ReadinessResponse,
  RuntimeErrorState,
  RuntimePhase,
  RuntimeStateKind
} from "@scriptorium/server-api";

interface PersistedState {
  phase: RuntimePhase;
  startedAt?: string;
  finishedAt?: string;
  lastSuccessfulPreparedAt?: string;
  activeGenerationId?: string;
  error?: string;
  instanceId?: string;
}

interface RuntimeStatusSnapshot {
  kind: RuntimeStateKind;
  phase: RuntimePhase;
  activeGenerationId?: string;
  preparedAt?: string;
  error?: RuntimeErrorState;
}

export class RuntimeStatusService {
  constructor(private readonly stateFile: string) {}

  async getSnapshot() {
    const persisted = await this.readPersistedState();
    return this.toSnapshot(persisted);
  }

  async getReadinessResponse(): Promise<ReadinessResponse> {
    const snapshot = await this.getSnapshot();

    return {
      state: {
        kind: snapshot.kind,
        ...(snapshot.activeGenerationId && snapshot.preparedAt
          ? {
              content: {
                token: snapshot.activeGenerationId,
                preparedAt: snapshot.preparedAt
              }
            }
          : {}),
        ...(snapshot.error ? { error: snapshot.error } : {})
      },
      phase: snapshot.phase
    };
  }

  private async readPersistedState() {
    try {
      const raw = await readFile(this.stateFile, "utf8");
      return JSON.parse(raw) as PersistedState;
    } catch {
      return null;
    }
  }

  private toSnapshot(state: PersistedState | null): RuntimeStatusSnapshot {
    const phase: RuntimePhase = state?.phase ?? "idle";
    const activeGenerationId = state?.activeGenerationId;
    const preparedAt = state?.lastSuccessfulPreparedAt;

    if (phase === "ready" && activeGenerationId && preparedAt) {
      return {
        kind: "ready",
        phase,
        activeGenerationId,
        preparedAt
      };
    }

    if (activeGenerationId && preparedAt) {
      return {
        kind: "refreshing",
        phase,
        activeGenerationId,
        preparedAt
      };
    }

    if (phase === "error") {
      return {
        kind: "failed",
        phase,
        error: {
          code: "PREPARATION_FAILED",
          message: state?.error ?? "The latest bundle could not be built."
        }
      };
    }

    return {
      kind: "starting",
      phase
    };
  }
}
