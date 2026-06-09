import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { RuntimePaths } from "./model/runtime-paths";
import type { RuntimePhase } from "./model/runtime-phase";
import type { RuntimeReadinessStatus } from "./model/runtime-readiness-status";
import { FileRuntimeStateStore } from "./persistence/file-runtime-state-store";

interface PreparationContext {
  generationId: string;
  generationDir: string;
  setPhase: (phase: Exclude<RuntimePhase, "idle" | "ready" | "error">) => void;
}

interface PreparationResult<Value> {
  generationId: string;
  generationDir: string;
  value: Value;
}

export function createPreparationController<Value>(options: {
  runtimePaths: RuntimePaths;
  prepare: (context: PreparationContext) => Promise<Value>;
  activate: (result: PreparationResult<Value>) => Promise<void> | void;
  instanceId?: string;
}) {
  const instanceId = options.instanceId ?? String(process.pid);
  let status: RuntimeReadinessStatus = {
    phase: "idle"
  };
  let currentRun: Promise<void> | null = null;
  let rerunRequested = false;
  const stateStore = new FileRuntimeStateStore(options.runtimePaths.stateFile, instanceId);

  function requestPrepare() {
    rerunRequested = true;
    if (currentRun)
      return currentRun;

    currentRun = runPreparationLoop()
      .finally(() => {
        currentRun = null;
      });

    return currentRun;
  }

  async function runPreparationLoop() {
    do {
      rerunRequested = false;
      await runPreparation();
    } while (rerunRequested);
  }

  async function runPreparation() {
    const { generationsDir } = options.runtimePaths;
    await mkdir(generationsDir, { recursive: true });

    const generationId = `${new Date().toISOString().replaceAll(":", "-")}-${randomUUID().slice(0, 8)}`;
    const generationDir = path.join(generationsDir, generationId);
    const startedAt = new Date().toISOString();

    status = {
      ...status,
      phase: "bundling",
      startedAt,
      finishedAt: undefined,
      error: undefined
    };
    await stateStore.queueWrite(status);

    try {
      const value = await options.prepare({
        generationId,
        generationDir,
        setPhase(phase) {
          status = {
            ...status,
            phase
          };
          void stateStore.queueWrite(status);
        }
      });

      await options.activate({
        generationId,
        generationDir,
        value
      });

      const finishedAt = new Date().toISOString();
      status = {
        phase: "ready",
        startedAt,
        finishedAt,
        lastSuccessfulPreparedAt: finishedAt,
        activeGenerationId: generationId
      };

      await stateStore.queueWrite(status);
    } catch (error: unknown) {
      const persisted = await stateStore.read();
      status = {
        phase: "error",
        startedAt,
        finishedAt: new Date().toISOString(),
        lastSuccessfulPreparedAt: persisted?.instanceId === instanceId ? persisted.lastSuccessfulPreparedAt : undefined,
        activeGenerationId: persisted?.instanceId === instanceId ? persisted.activeGenerationId : undefined,
        error: error instanceof Error ? error.message : String(error)
      };
      await stateStore.queueWrite(status);
    }
  }

  return {
    requestPrepare
  };
}
