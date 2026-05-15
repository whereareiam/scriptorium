import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StageRepository } from "@scriptorium/core";
import { buildProjectBundle } from "@scriptorium/bundle";
import type { RuntimeConfig } from "./runtime-config";
import { getRuntimePaths } from "./runtime-paths";

interface RuntimeState {
  lastSyncedAt: string;
  manifestHash: string;
}

export type RuntimeRepositorySync = (repoDir: string, config: RuntimeConfig) => Promise<StageRepository>;

export function createRuntimeSnapshotController(syncRepository: RuntimeRepositorySync) {
  const syncLocks = new Map<string, Promise<void>>();

  async function ensureRuntimeSnapshot(force = false) {
    const { config, repoDir, bundleDir, stateFile } = getRuntimePaths();
    const lockKey = repoDir;
    const existing = syncLocks.get(lockKey);
    if (existing) {
      await existing;
      if (force) return ensureRuntimeSnapshot(true);

      return;
    }

    const run = (async () => {
      await mkdir(config.runtime.dataDir, { recursive: true });

      if (!force) {
        const state = await readRuntimeState(stateFile);
        if (state) {
          const ageMs = Date.now() - Date.parse(state.lastSyncedAt);
          if (ageMs < config.runtime.refreshIntervalSeconds * 1000) {
            return;
          }
        }
      }

      const repository = await syncRepository(repoDir, config);
      await buildProjectBundle({
        projectRoot: repoDir,
        outputDir: bundleDir,
        repository
      });

      const manifestHash = await hashFile(path.join(bundleDir, "manifest.json"));
      await writeFile(
        stateFile,
        JSON.stringify(
          {
            lastSyncedAt: new Date().toISOString(),
            manifestHash
          } satisfies RuntimeState,
          null,
          2
        )
      );
    })();

    syncLocks.set(lockKey, run);
    try {
      await run;
    } finally {
      syncLocks.delete(lockKey);
    }
  }

  async function refreshRuntimeSnapshot() {
    await ensureRuntimeSnapshot(true);
  }

  return {
    ensureRuntimeSnapshot,
    refreshRuntimeSnapshot
  };
}

async function readRuntimeState(stateFile: string) {
  try {
    const raw = await readFile(stateFile, "utf8");
    return JSON.parse(raw) as RuntimeState;
  } catch {
    return null;
  }
}

async function hashFile(filePath: string) {
  const content = await readFile(filePath);
  return createHash("sha256").update(content).digest("hex");
}
