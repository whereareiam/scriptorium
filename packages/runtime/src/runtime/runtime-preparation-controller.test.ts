import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "bun:test";
import { createRuntimePreparationController } from "./runtime-preparation-controller";
import type { RuntimeConfig } from "./runtime-config";

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("createRuntimePreparationController", () => {
  it("starts non-ready and becomes ready after a successful preparation run", async () => {
    const dataDir = await createTempDir();
    const controller = createRuntimePreparationController({
      getRuntimeConfig: () => createRuntimeConfig(dataDir),
      prepare: async ({ setPhase }) => {
        setPhase("preparing-content");
        return { ok: true };
      },
      activate: async () => undefined
    });

    expect((await controller.getReadiness()).ok).toBe(false);

    await controller.startBackgroundPreparation();
    const readiness = await controller.getReadiness();

    expect(readiness.ok).toBe(true);
    expect(readiness.status.phase).toBe("ready");
    expect(readiness.status.activeGenerationId).toBeTruthy();
    expect(readiness.status.lastSuccessfulPreparedAt).toBeTruthy();
  });

  it("coalesces concurrent refresh requests into one queued rerun", async () => {
    const dataDir = await createTempDir();
    let runs = 0;
    let releaseFirstRun: (() => void) | null = null;
    const firstRunDone = new Promise<void>((resolve) => {
      releaseFirstRun = resolve;
    });

    const controller = createRuntimePreparationController({
      getRuntimeConfig: () => createRuntimeConfig(dataDir),
      prepare: async ({ setPhase }) => {
        runs += 1;
        setPhase("preparing-content");
        if (runs === 1) {
          await firstRunDone;
        }

        return { run: runs };
      },
      activate: async () => undefined
    });

    const first = controller.requestPrepare();
    controller.requestPrepare();
    controller.requestPrepare();
    releaseFirstRun?.();
    await first;

    expect(runs).toBe(2);
    expect((await controller.getReadiness()).ok).toBe(true);
  });

  it("reports an error while keeping the last successful generation metadata", async () => {
    const dataDir = await createTempDir();
    let shouldFail = false;
    const controller = createRuntimePreparationController({
      getRuntimeConfig: () => createRuntimeConfig(dataDir),
      prepare: async () => {
        if (shouldFail) {
          throw new Error("boom");
        }

        return { ok: true };
      },
      activate: async () => undefined
    });

    await controller.requestPrepare();
    const previousReadiness = await controller.getReadiness();
    shouldFail = true;

    await controller.requestPrepare();
    const readiness = await controller.getReadiness();

    expect(readiness.ok).toBe(false);
    expect(readiness.status.phase).toBe("error");
    expect(readiness.status.error).toBe("boom");
    expect(readiness.status.activeGenerationId).toBe(previousReadiness.status.activeGenerationId);
    expect(readiness.status.lastSuccessfulPreparedAt).toBe(previousReadiness.status.lastSuccessfulPreparedAt);
  });
});

async function createTempDir() {
  const dir = await mkdtemp(path.join(os.tmpdir(), "scriptorium-runtime-"));
  tempDirs.push(dir);
  return dir;
}

function createRuntimeConfig(dataDir: string): RuntimeConfig {
  return {
    source: {
      type: "local",
      defaultBranch: "dev",
      auth: {
        username: "x-access-token"
      }
    },
    runtime: {
      dataDir
    }
  };
}
