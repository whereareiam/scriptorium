import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createFromSource } from "fumadocs-core/search/server";
import { getRefMetadata, getRefUrl } from "@scriptorium/core";
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
  getRuntimePaths
} from "@scriptorium/runtime";
import {
  createGitCliStageRepository,
  createGitHubWebhookHandler,
  syncGitCliRepository
} from "@scriptorium/source-git";
import {
  createLocalContractWatcher,
  createLocalStageRepository
} from "@scriptorium/source-local";

interface PreparedRuntimeContent {
  generationId: string;
  generationDir: string;
  bundle: BundleManifest;
  source: DocsSource;
  currentAssetsDir: string;
  searchIndexPath: string;
}

function isGitSourceEnabled() {
  return getRuntimeConfig().source.type === "git";
}

interface ScriptoriumRuntimeSingleton {
  activePreparedContent: PreparedRuntimeContent | null;
  hydratingPreparedContent: Promise<PreparedRuntimeContent | null> | null;
  localWatcher: { close(): void } | null;
  servicesStarted: boolean;
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

const handleGitHubWebhook = createGitHubWebhookHandler({
  isEnabled: isGitSourceEnabled,
  getSecret: () => getRuntimeConfig().triggers?.webhook?.secret,
  refresh: async () => {
    await singleton.runtimePreparationController.requestPrepare();
  }
});

function ensureRuntimeServices() {
  if (singleton.servicesStarted)
    return;

  singleton.servicesStarted = true;
  void ensureHydratedPreparedContent()
    .then((prepared) => {
      if (!prepared) {
        return singleton.runtimePreparationController.startBackgroundPreparation();
      }

      return null;
    });

  if (getRuntimeConfig().source.type === "local" && !singleton.localWatcher) {
    singleton.localWatcher = createLocalContractWatcher({
      projectRoot: getLocalProjectRoot(),
      onChange() {
        void singleton.runtimePreparationController.requestPrepare();
      }
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
  if (!state?.activeGenerationId)
    return null;

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
  if (readiness.ok) {
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

export { buildWorkspaceThemeStylesheet, getRefMetadata, getRefUrl, handleGitHubWebhook, readCurrentAsset };
export { getLocalProjectRoot, getRuntimeConfig, getRuntimePaths };

ensureRuntimeServices();

function createScriptoriumRuntimeSingleton(): ScriptoriumRuntimeSingleton {
  return {
    activePreparedContent: null,
    hydratingPreparedContent: null,
    localWatcher: null,
    servicesStarted: false,
    runtimePreparationController: createRuntimePreparationController<PreparedRuntimeContent>({
      getRuntimeConfig,
      async prepare({ config, generationDir, generationId, setPhase }) {
        await mkdir(generationDir, { recursive: true });
        const bundleDir = path.join(generationDir, "bundle");
        const searchIndexPath = path.join(generationDir, "search-index.json");

        let projectRoot: string;
        if (config.source.type === "git") {
          if (!config.source.target) {
            throw new Error("Runtime source.target is not configured for git source mode.");
          }

          projectRoot = getRuntimePaths().repoDir;
          await syncGitCliRepository({
            repoDir: projectRoot,
            repoUrl: config.source.target,
            defaultBranch: config.source.defaultBranch,
            authToken: config.source.auth?.token,
            authUsername: config.source.auth?.username
          });

          await buildProjectBundle({
            projectRoot,
            outputDir: bundleDir,
            repository: createGitCliStageRepository(projectRoot)
          });
        } else {
          projectRoot = getLocalProjectRoot();
          await buildProjectBundle({
            projectRoot,
            outputDir: bundleDir,
            repository: createLocalStageRepository(projectRoot)
          });
        }

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
