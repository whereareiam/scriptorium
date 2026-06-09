import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { RuntimeReadinessStatus } from "../model/runtime-readiness-status";
import type { PersistedRuntimeState } from "./persisted-runtime-state";

export class FileRuntimeStateStore {
  private queuedWrite: Promise<void> = Promise.resolve();

  constructor(
    private readonly stateFile: string,
    private readonly instanceId: string
  ) {
  }

  read(): Promise<PersistedRuntimeState | null> {
    return readRuntimeState(this.stateFile);
  }

  queueWrite(status: RuntimeReadinessStatus): Promise<void> {
    this.queuedWrite = this.queuedWrite
      .catch(() => undefined)
      .then(() => writeRuntimeState(this.stateFile, toPersistedRuntimeState(status, this.instanceId)));

    return this.queuedWrite;
  }
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

function toPersistedRuntimeState(
  status: RuntimeReadinessStatus,
  instanceId: string
): PersistedRuntimeState {
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
