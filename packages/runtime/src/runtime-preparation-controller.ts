import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { RuntimeConfig } from "./runtime-config";
import { getRuntimePaths } from "./runtime-paths";

export type RuntimePhase = "idle" | "bundling" | "preparing-content" | "preparing-search" | "ready" | "error";

export interface RuntimeReadinessStatus {
  phase: RuntimePhase;
  startedAt?: string;
  finishedAt?: string;
  lastSuccessfulPreparedAt?: string;
  activeGenerationId?: string;
  error?: string;
}

export interface RuntimeReadiness {
  ok: boolean;
  status: RuntimeReadinessStatus;
}

interface PersistedRuntimeState {
  instanceId: string;
  phase: RuntimePhase;
  startedAt?: string;
  finishedAt?: string;
  activeGenerationId?: string;
  lastSuccessfulPreparedAt?: string;
  error?: string;
}

interface PreparationContext {
  config: RuntimeConfig;
  generationId: string;
  generationDir: string;
  setPhase: (phase: Exclude<RuntimePhase, "idle" | "ready" | "error">) => void;
}

interface PreparationResult<Value> {
  generationId: string;
  generationDir: string;
  value: Value;
}

export function createRuntimePreparationController<Value>(options: {
  getRuntimeConfig: () => RuntimeConfig;
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
  let servicesStarted = false;
  let queuedStateWrite: Promise<void> = Promise.resolve();

  async function startBackgroundPreparation() {
    if (servicesStarted)
      return currentRun;

    servicesStarted = true;
    return requestPrepare();
  }

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
    const { config, generationsDir, stateFile } = getRuntimePaths();
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
    await queueStateWrite(stateFile, status);

    try {
      const value = await options.prepare({
        config,
        generationId,
        generationDir,
        setPhase(phase) {
          status = {
            ...status,
            phase
          };
          void queueStateWrite(stateFile, status);
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

      await queueStateWrite(stateFile, status);
    } catch (error: unknown) {
      const persisted = await readRuntimeState(stateFile);
      status = {
        phase: "error",
        startedAt,
        finishedAt: new Date().toISOString(),
        lastSuccessfulPreparedAt: persisted?.instanceId === instanceId ? persisted.lastSuccessfulPreparedAt : undefined,
        activeGenerationId: persisted?.instanceId === instanceId ? persisted.activeGenerationId : undefined,
        error: error instanceof Error ? error.message : String(error)
      };
      await queueStateWrite(stateFile, status);
    }
  }

  async function getReadiness(): Promise<RuntimeReadiness> {
    const persisted = await readRuntimeState(getRuntimePaths().stateFile);
    if (persisted?.instanceId === instanceId) {
      status = {
        phase: persisted.phase,
        startedAt: persisted.startedAt,
        finishedAt: persisted.finishedAt,
        lastSuccessfulPreparedAt: persisted.lastSuccessfulPreparedAt,
        activeGenerationId: persisted.activeGenerationId,
        error: persisted.error
      };
    }

    return {
      ok: status.phase === "ready",
      status
    };
  }

  function queueStateWrite(stateFile: string, nextStatus: RuntimeReadinessStatus) {
    queuedStateWrite = queuedStateWrite
      .catch(() => undefined)
      .then(() => writeRuntimeState(stateFile, toPersistedRuntimeState(nextStatus, instanceId)));

    return queuedStateWrite;
  }

  return {
    getReadiness,
    getStatus: () => status,
    requestPrepare,
    startBackgroundPreparation
  };
}

async function readRuntimeState(stateFile: string) {
  try {
    const raw = await readFile(stateFile, "utf8");
    return JSON.parse(raw) as PersistedRuntimeState;
  } catch {
    return null;
  }
}

async function writeRuntimeState(stateFile: string, state: PersistedRuntimeState) {
  const tmpPath = `${stateFile}.${randomUUID().slice(0, 8)}.tmp`;
  await mkdir(path.dirname(stateFile), { recursive: true });
  await writeFile(tmpPath, JSON.stringify(state, null, 2));
  await rm(stateFile, { force: true }).catch(() => undefined);
  await rename(tmpPath, stateFile);
}

function toPersistedRuntimeState(status: RuntimeReadinessStatus, instanceId: string): PersistedRuntimeState {
  return {
    instanceId,
    phase: status.phase,
    startedAt: status.startedAt,
    finishedAt: status.finishedAt,
    activeGenerationId: status.activeGenerationId,
    lastSuccessfulPreparedAt: status.lastSuccessfulPreparedAt,
    error: status.error
  };
}
