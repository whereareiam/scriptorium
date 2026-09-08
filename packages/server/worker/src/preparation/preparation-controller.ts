import { randomUUID } from "node:crypto";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import type { PrepareRequest } from "@scriptorium/server-worker-api";
import type { RuntimePaths } from "./model/runtime-paths";
import type { RuntimePhase } from "./model/runtime-phase";
import type { RuntimeReadinessStatus } from "./model/runtime-readiness-status";
import type { BundlingLogger } from "./logging/bundling-logger";
import { FileRuntimeStateStore } from "./persistence/file-runtime-state-store";
import { pruneGenerations } from "./prune-generations";

interface PreparationContext {
  generationId: string;
  generationDir: string;
  activeGenerationId?: string;
  request: PrepareRequest | undefined;
  setPhase: (phase: Exclude<RuntimePhase, "idle" | "ready" | "error">) => void;
}

interface PreparationResult<Value> {
  generationId: string;
  generationDir: string;
  value: Value;
}

export function createPreparationController<Value>(options: {
  runtimePaths: RuntimePaths;
  prepare: (context: PreparationContext) => Promise<Value | null>;
  activate: (result: PreparationResult<Value>) => Promise<void> | void;
  getCompletionPayload?: (value: Value) => Record<string, unknown>;
  onIdle?: () => void;
  instanceId?: string;
  logger?: BundlingLogger;
}) {
  const instanceId = options.instanceId ?? String(process.pid);
  let status: RuntimeReadinessStatus = {
    phase: "idle"
  };
  let currentRun: Promise<void> | null = null;
  let rerunRequested = false;
  let nextRequest: PrepareRequest | undefined;
  let fallbackGenerationId: string | undefined;
  const stateStore = new FileRuntimeStateStore(options.runtimePaths.stateFile, instanceId);

  function requestPrepare(request?: PrepareRequest) {
    nextRequest = request ?? nextRequest;
    options.logger?.emit("bundle_triggered", {
      trigger_reason: request?.reason,
      event_name: request?.event
    });

    if (currentRun) {
      options.logger?.emit("bundle_rerun_queued", {
        trigger_reason: request?.reason,
        event_name: request?.event,
        rerun_queued: true
      });
    }

    rerunRequested = true;
    if (currentRun)
      return currentRun;

    currentRun = runPreparationLoop()
      .finally(() => {
        currentRun = null;
        options.onIdle?.();
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

    const request = nextRequest;
    nextRequest = undefined;
    const generationId = `${new Date().toISOString().replaceAll(":", "-")}-${randomUUID().slice(0, 8)}`;
    const generationDir = path.join(generationsDir, generationId);
    const startedAt = new Date().toISOString();
    const phaseDurations = new Map<string, number>();
    let activePhase: Exclude<RuntimePhase, "idle" | "ready" | "error"> = "bundling";
    let activePhaseStartedAt = Date.now();

    options.logger?.emit("bundle_started", {
      run_id: generationId,
      trigger_reason: request?.reason,
      event_name: request?.event,
      active_generation_id: status.activeGenerationId
    });
    options.logger?.emit("bundle_phase_started", {
      run_id: generationId,
      trigger_reason: request?.reason,
      event_name: request?.event,
      phase: activePhase
    });

    const previousStatus = status;
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
        activeGenerationId: previousStatus.activeGenerationId,
        request,
        setPhase(phase) {
          const now = Date.now();
          phaseDurations.set(activePhase, (phaseDurations.get(activePhase) ?? 0) + now - activePhaseStartedAt);
          options.logger?.emit("bundle_phase_finished", {
            run_id: generationId,
            trigger_reason: request?.reason,
            event_name: request?.event,
            phase: activePhase,
            duration_ms: now - activePhaseStartedAt
          });
          activePhase = phase;
          activePhaseStartedAt = now;
          options.logger?.emit("bundle_phase_started", {
            run_id: generationId,
            trigger_reason: request?.reason,
            event_name: request?.event,
            phase
          });
          status = {
            ...status,
            phase
          };
          void stateStore.queueWrite(status);
        }
      });

      if (value === null) {
        if (!previousStatus.activeGenerationId)
          throw new Error("Cannot skip preparation without an active generation.");
        await rm(generationDir, { recursive: true, force: true });
        status = { ...previousStatus, phase: "ready", error: undefined };
        await stateStore.queueWrite(status);
        options.logger?.emit("bundle_skipped", {
          run_id: generationId,
          active_generation_id: status.activeGenerationId,
          trigger_reason: request?.reason,
          event_name: request?.event,
          duration_ms: Date.now() - new Date(startedAt).getTime()
        });
        await cleanupGenerations();
        return;
      }

      await options.activate({
        generationId,
        generationDir,
        value
      });

      const completedAt = Date.now();
      phaseDurations.set(activePhase, (phaseDurations.get(activePhase) ?? 0) + completedAt - activePhaseStartedAt);
      options.logger?.emit("bundle_phase_finished", {
        run_id: generationId,
        trigger_reason: request?.reason,
        event_name: request?.event,
        phase: activePhase,
        duration_ms: completedAt - activePhaseStartedAt
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
      fallbackGenerationId = previousStatus.activeGenerationId;
      options.logger?.emit("bundle_completed", {
        run_id: generationId,
        trigger_reason: request?.reason,
        event_name: request?.event,
        duration_ms: new Date(finishedAt).getTime() - new Date(startedAt).getTime(),
        phase_durations_ms: Object.fromEntries(phaseDurations),
        ...options.getCompletionPayload?.(value)
      });
      await cleanupGenerations();
    } catch (error: unknown) {
      await rm(generationDir, { recursive: true, force: true }).catch(() => undefined);
      const failedAt = Date.now();
      phaseDurations.set(activePhase, (phaseDurations.get(activePhase) ?? 0) + failedAt - activePhaseStartedAt);
      options.logger?.emit("bundle_phase_finished", {
        run_id: generationId,
        trigger_reason: request?.reason,
        event_name: request?.event,
        phase: activePhase,
        duration_ms: failedAt - activePhaseStartedAt
      });
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
      options.logger?.emit("bundle_failed", {
        run_id: generationId,
        trigger_reason: request?.reason,
        event_name: request?.event,
        duration_ms: Date.now() - new Date(startedAt).getTime(),
        error: error instanceof Error ? error.message : String(error),
        phase_durations_ms: Object.fromEntries(phaseDurations)
      });
    }
  }

  async function cleanupGenerations() {
    try {
      await pruneGenerations(options.runtimePaths.generationsDir,
        [status.activeGenerationId, fallbackGenerationId].filter((id): id is string => Boolean(id)));
    } catch (error) {
      options.logger?.emit("generation_cleanup_failed", {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return {
    requestPrepare
  };
}
