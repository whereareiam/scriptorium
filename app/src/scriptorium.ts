import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createFromSource } from "fumadocs-core/search/server";
import {
  getRefMetadata,
  getRefUrl,
  type ScriptoriumProjectConfig
} from "@scriptorium/core";
import { buildProjectBundle, readBundleManifest, type BundleManifest } from "@scriptorium/bundle";
import {
  buildWorkspaceThemeStylesheet,
  createCurrentAssetReader,
  createDocsSourceAccess,
  type DocsSource
} from "@scriptorium/content";
import {
  createRuntimePreparationController,
  getLocalProjectRoot,
  getRuntimeConfig,
  getRuntimePaths,
  type SourceRuntimeAdapter
} from "@scriptorium/runtime";
import { createGitSourceRuntimeAdapter } from "@scriptorium/source-git";
import { createLocalSourceRuntimeAdapter } from "@scriptorium/source-local";
import { resolveBundlingCaptions } from "./app/_layout/runtime-warmup-copy";

interface PreparedRuntimeContent {
  generationId: string;
  generationDir: string;
  bundle: BundleManifest;
  source: DocsSource;
  currentAssetsDir: string;
  searchIndexPath: string;
}

interface ScriptoriumRuntimeSingleton {
  activePreparedContent: PreparedRuntimeContent | null;
  hydratingPreparedContent: Promise<PreparedRuntimeContent | null> | null;
  backgroundServiceHandle: { close(): void } | null;
  servicesStarted: boolean;
  sourceAdapter: SourceRuntimeAdapter;
  runtimePreparationController: ReturnType<typeof createRuntimePreparationController<PreparedRuntimeContent>>;
}

const globalRuntime = globalThis as typeof globalThis & {
  __scriptoriumRuntime?: ScriptoriumRuntimeSingleton;
};

const singleton = globalRuntime.__scriptoriumRuntime ??= createScriptoriumRuntimeSingleton();

const readCurrentAsset = createCurrentAssetReader({
  getCurrentAssetsDir(projectRoot) {
    if (singleton.activePreparedContent)
      return singleton.activePreparedContent.currentAssetsDir;

    return path.join(projectRoot ?? getLocalProjectRoot(), ".scriptorium", "bundle", "current", "assets");
  }
});

async function handleSourceWebhook(request: Request) {
  if (!singleton.sourceAdapter.handleWebhook) {
    return Response.json({ error: "Webhook source is not enabled." }, { status: 404 });
  }

  return singleton.sourceAdapter.handleWebhook(request, {
    requestPrepare: () => singleton.runtimePreparationController.requestPrepare()
  });
}

function ensureRuntimeServices() {
  if (!singleton.servicesStarted) {
    singleton.servicesStarted = true;
    void ensureHydratedPreparedContent()
      .then((prepared) => {
        if (!prepared) {
          return singleton.runtimePreparationController.startBackgroundPreparation();
        }

        return null;
      });
  }

  if (singleton.runtimePreparationController.getStatus().phase === "idle" && !singleton.activePreparedContent) {
    void singleton.runtimePreparationController.requestPrepare();
  }

  if (!singleton.backgroundServiceHandle && singleton.sourceAdapter.startBackgroundServices) {
    singleton.backgroundServiceHandle = singleton.sourceAdapter.startBackgroundServices({
      requestPrepare: () => singleton.runtimePreparationController.requestPrepare()
    });
  }
}

async function loadPreparedSource(bundle: BundleManifest) {
  const sourceAccess = createDocsSourceAccess(async () => bundle);
  const { source } = await sourceAccess.getSource(bundle.projectRoot);

  await Promise.all(source.getPages().map(async (page) => {
    if ("load" in page.data && typeof page.data.load === "function") {
      await page.data.load();
    }
  }));

  return source;
}

async function exportPreparedSearchIndex(source: DocsSource) {
  const searchServer = createFromSource(source);
  const response = await searchServer.staticGET();
  return response.text();
}

async function ensureHydratedPreparedContent() {
  if (singleton.activePreparedContent)
    return singleton.activePreparedContent;

  if (singleton.hydratingPreparedContent)
    return singleton.hydratingPreparedContent;

  singleton.hydratingPreparedContent = hydratePreparedContentFromState()
    .finally(() => {
      singleton.hydratingPreparedContent = null;
    });

  return singleton.hydratingPreparedContent;
}

async function hydratePreparedContentFromState() {
  const state = await readPersistedRuntimeState();
  if (!state?.activeGenerationId || state.phase !== "ready")
    return null;

  if (singleton.sourceAdapter.type === "local" && state.instanceId !== getRuntimeInstanceId()) {
    return null;
  }

  const generationDir = path.join(getRuntimePaths().generationsDir, state.activeGenerationId);
  const bundleDir = path.join(generationDir, "bundle");
  const searchIndexPath = path.join(generationDir, "search-index.json");
  const bundle = await readBundleManifest(getLocalProjectRoot(), bundleDir);
  const source = await loadPreparedSource(bundle);

  const prepared = {
    generationId: state.activeGenerationId,
    generationDir,
    bundle,
    source,
    currentAssetsDir: path.join(bundleDir, "current", "assets"),
    searchIndexPath
  } satisfies PreparedRuntimeContent;
  singleton.activePreparedContent = prepared;
  return prepared;
}

async function readPersistedRuntimeState() {
  try {
    const raw = await readFile(getRuntimePaths().stateFile, "utf8");
    return JSON.parse(raw) as {
      instanceId?: string;
      phase?: "idle" | "bundling" | "preparing-content" | "preparing-search" | "ready" | "error";
      activeGenerationId?: string;
      lastSuccessfulPreparedAt?: string;
    };
  } catch {
    return null;
  }
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
  await ensureHydratedPreparedContent();
  const prepared = getActivePreparedContent();
  return readFile(prepared.searchIndexPath, "utf8");
}

export async function getRuntimeReadiness() {
  ensureRuntimeServices();
  const readiness = await singleton.runtimePreparationController.getReadiness();
  if (readiness.ok || readiness.status.phase !== "idle") {
    return readiness;
  }

  const hydrated = await ensureHydratedPreparedContent();
  if (!hydrated) {
    return readiness;
  }

  const persisted = await readPersistedRuntimeState();
  return {
    ok: true,
    status: {
      phase: "ready" as const,
      activeGenerationId: hydrated.generationId,
      lastSuccessfulPreparedAt: persisted?.lastSuccessfulPreparedAt,
      error: undefined
    }
  };
}

export async function requestRuntimePreparation() {
  ensureRuntimeServices();
  await singleton.runtimePreparationController.requestPrepare();
}

export {
  buildWorkspaceThemeStylesheet,
  getRefMetadata,
  getRefUrl,
  handleSourceWebhook,
  readCurrentAsset
};
export { getLocalProjectRoot, getRuntimeConfig, getRuntimePaths };

ensureRuntimeServices();

function createScriptoriumRuntimeSingleton(): ScriptoriumRuntimeSingleton {
  const sourceAdapter = createSourceRuntimeAdapter();

  return {
    activePreparedContent: null,
    hydratingPreparedContent: null,
    backgroundServiceHandle: null,
    servicesStarted: false,
    sourceAdapter,
    runtimePreparationController: createRuntimePreparationController<PreparedRuntimeContent>({
      instanceId: getRuntimeInstanceId(),
      getRuntimeConfig,
      async prepare({ generationDir, generationId, setPhase }) {
        await mkdir(generationDir, { recursive: true });
        const bundleDir = path.join(generationDir, "bundle");
        const searchIndexPath = path.join(generationDir, "search-index.json");

        const { projectRoot, repository } = await sourceAdapter.prepareRepository();
        await buildProjectBundle({
          projectRoot,
          outputDir: bundleDir,
          repository
        });

        const bundle = await readBundleManifest(projectRoot, bundleDir);

        setPhase("preparing-content");
        const source = await loadPreparedSource(bundle);

        setPhase("preparing-search");
        const searchPayload = await exportPreparedSearchIndex(source);
        await writeFile(searchIndexPath, searchPayload);

        return {
          generationId,
          generationDir,
          bundle,
          source,
          currentAssetsDir: path.join(bundleDir, "current", "assets"),
          searchIndexPath
        };
      },
      async activate({ value }) {
        singleton.activePreparedContent = value;
      }
    })
  };
}

async function loadBundlingProjectConfig(): Promise<ScriptoriumProjectConfig | null> {
  return singleton.sourceAdapter.loadProjectConfigForWarmup();
}

function createSourceRuntimeAdapter() {
  const config = getRuntimeConfig();
  if (config.source.type === "git") {
    return createGitSourceRuntimeAdapter({
      getRuntimeConfig,
      getRuntimePaths
    });
  }

  return createLocalSourceRuntimeAdapter({
    getLocalProjectRoot
  });
}

function getRuntimeInstanceId() {
  return String(process.ppid && process.ppid > 1 ? process.ppid : process.pid);
}
