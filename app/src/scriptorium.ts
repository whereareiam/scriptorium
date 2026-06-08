import path from "node:path";
import {
  getRefMetadata,
  getRefUrl,
  type ScriptoriumProjectConfig
} from "@scriptorium/core";
import {
  buildWorkspaceThemeStylesheet,
  createCurrentAssetReader
} from "@scriptorium/content";
import {
  getLocalProjectRoot,
  getRuntimeConfig,
  getRuntimePaths,
  type RuntimeReadiness
} from "@scriptorium/runtime";
import { resolveBundlingCaptions } from "./app/_layout/runtime-warmup-copy";
import {
  hydratePreparedContent,
  readPreparedSearchIndex,
  type PreparedRuntimeContent
} from "./scriptorium/prepared-content";
import { readPersistedState, toRuntimeReadiness } from "./scriptorium/persisted-state";
import { createSourceAdapter } from "./scriptorium/source-adapter";
import { createWorkerSupervisor } from "./scriptorium/worker/supervisor";

interface ScriptoriumRuntimeSingleton {
  activePreparedContent: PreparedRuntimeContent | null;
  hydratingPreparedContent: Promise<PreparedRuntimeContent | null> | null;
  hydratingGenerationId: string | null;
  servicesStarted: boolean;
  sourceAdapter: ReturnType<typeof createSourceAdapter>;
  workerSupervisor: ReturnType<typeof createWorkerSupervisor>;
}

const globalRuntime = globalThis as typeof globalThis & {
  __scriptoriumRuntime?: ScriptoriumRuntimeSingleton;
};

const singleton = globalRuntime.__scriptoriumRuntime ??= createScriptoriumRuntimeSingleton();

const readCurrentAsset = createCurrentAssetReader({
  async getCurrentAssetsDir(projectRoot) {
    const state = await readPersistedState();
    if (state?.phase === "ready" && state.activeGenerationId) {
      if (singleton.activePreparedContent?.generationId === state.activeGenerationId) {
        return singleton.activePreparedContent.currentAssetsDir;
      }

      return path.join(getRuntimePaths().generationsDir, state.activeGenerationId, "bundle", "current", "assets");
    }

    return path.join(projectRoot ?? getLocalProjectRoot(), ".scriptorium", "bundle", "current", "assets");
  }
});

async function handleSourceWebhook(request: Request) {
  if (!singleton.sourceAdapter.handleWebhook) {
    return Response.json({ error: "Webhook source is not enabled." }, { status: 404 });
  }

  return singleton.sourceAdapter.handleWebhook(request, {
    requestPrepare: () => singleton.workerSupervisor.requestPrepare()
  });
}

export function ensureRuntimeServices() {
  if (singleton.servicesStarted) {
    return;
  }

  singleton.servicesStarted = true;
  singleton.workerSupervisor.start();
}

async function ensureHydratedPreparedContent() {
  const state = await readPersistedState();
  if (state?.phase !== "ready" || !state.activeGenerationId) {
    return singleton.activePreparedContent;
  }

  if (singleton.activePreparedContent?.generationId === state.activeGenerationId) {
    return singleton.activePreparedContent;
  }

  if (
    singleton.hydratingPreparedContent
    && singleton.hydratingGenerationId === state.activeGenerationId
  ) {
    return singleton.hydratingPreparedContent;
  }

  singleton.hydratingGenerationId = state.activeGenerationId;
  singleton.hydratingPreparedContent = hydratePreparedContent(state.activeGenerationId)
    .then((prepared) => {
      singleton.activePreparedContent = prepared;
      return prepared;
    })
    .finally(() => {
      singleton.hydratingPreparedContent = null;
      singleton.hydratingGenerationId = null;
    });

  return singleton.hydratingPreparedContent;
}

function getActivePreparedContent() {
  if (!singleton.activePreparedContent)
    throw new Error("Runtime content is not ready yet.");

  return singleton.activePreparedContent;
}

export async function getProjectConfig() {
  ensureRuntimeServices();
  await ensureHydratedPreparedContent();
  return getActivePreparedContent().bundle.project;
}

export async function getBundlingCaptions() {
  ensureRuntimeServices();

  const hydrated = await ensureHydratedPreparedContent();
  if (hydrated) {
    return resolveBundlingCaptions(hydrated.bundle.project);
  }

  return resolveBundlingCaptions(await loadBundlingProjectConfig());
}

export async function getPublishedVersions() {
  ensureRuntimeServices();
  await ensureHydratedPreparedContent();
  return getActivePreparedContent().bundle.versions;
}

export async function getSource() {
  ensureRuntimeServices();
  await ensureHydratedPreparedContent();
  return {
    source: getActivePreparedContent().source
  };
}

export async function getPreparedSearchIndex() {
  ensureRuntimeServices();
  const readiness = await getRuntimeReadiness();
  if (!readiness.ok || !readiness.status.activeGenerationId) {
    throw new Error("Search is not ready.");
  }

  return readPreparedSearchIndex(readiness.status.activeGenerationId);
}

export async function getRuntimeReadiness(): Promise<RuntimeReadiness> {
  ensureRuntimeServices();
  return toRuntimeReadiness(await readPersistedState());
}

export async function requestRuntimePreparation() {
  ensureRuntimeServices();
  await singleton.workerSupervisor.requestPrepare();
}

export {
  buildWorkspaceThemeStylesheet,
  getRefMetadata,
  getRefUrl,
  handleSourceWebhook,
  readCurrentAsset
};
export { getLocalProjectRoot, getRuntimeConfig, getRuntimePaths };

function createScriptoriumRuntimeSingleton(): ScriptoriumRuntimeSingleton {
  const sourceAdapter = createSourceAdapter();

  return {
    activePreparedContent: null,
    hydratingPreparedContent: null,
    hydratingGenerationId: null,
    servicesStarted: false,
    sourceAdapter,
    workerSupervisor: createWorkerSupervisor({
      sourceAdapter
    })
  };
}

async function loadBundlingProjectConfig(): Promise<ScriptoriumProjectConfig | null> {
  return singleton.sourceAdapter.loadProjectConfigForWarmup();
}
