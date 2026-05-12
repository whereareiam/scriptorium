import { access } from "node:fs/promises";
import path from "node:path";
import type { RuntimeConfig } from "./runtime-config";

export interface RuntimeWarmupStatus {
  phase: "idle" | "warming" | "ready" | "error";
  startedAt?: string;
  finishedAt?: string;
  error?: string;
}

export function createRuntimeWarmup(options: {
  isRuntimeBundleEnabled: () => boolean;
  getRuntimeConfig: () => RuntimeConfig;
  ensureRuntimeSnapshot: () => Promise<void>;
}) {
  let status: RuntimeWarmupStatus = {
    phase: "idle"
  };
  let currentRun: Promise<void> | null = null;

  async function hasCachedBundle() {
    if (!options.isRuntimeBundleEnabled()) {
      return true;
    }

    const manifestPath = path.join(options.getRuntimeConfig().runtime.dataDir, "bundle", "manifest.json");

    try {
      await access(manifestPath);
      return true;
    } catch {
      return false;
    }
  }

  function startBackgroundWarmup() {
    if (!options.isRuntimeBundleEnabled()) {
      status = {
        phase: "ready",
        finishedAt: new Date().toISOString()
      };
      return null;
    }

    if (currentRun) {
      return currentRun;
    }

    const startedAt = new Date().toISOString();
    status = {
      phase: "warming",
      startedAt
    };

    const run = options.ensureRuntimeSnapshot()
      .then(() => {
        status = {
          phase: "ready",
          startedAt,
          finishedAt: new Date().toISOString()
        };
      })
      .catch((error: unknown) => {
        status = {
          phase: "error",
          startedAt,
          finishedAt: new Date().toISOString(),
          error: error instanceof Error ? error.message : String(error)
        };
      })
      .finally(() => {
        currentRun = null;
      });

    currentRun = run;
    return run;
  }

  async function getReadiness() {
    const runtimeEnabled = options.isRuntimeBundleEnabled();
    const cachedBundle = await hasCachedBundle();

    return {
      runtimeEnabled,
      cachedBundle,
      ready: !runtimeEnabled || cachedBundle,
      status
    };
  }

  return {
    getReadiness,
    getStatus: () => status,
    hasCachedBundle,
    startBackgroundWarmup
  };
}
