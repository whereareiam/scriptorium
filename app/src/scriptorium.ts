import { getRefMetadata, getRefUrl } from "@scriptorium/core";
import { buildProjectBundle } from "@scriptorium/bundle";
import { createWebhookTriggerHandler } from "@scriptorium/trigger-webhook";
import {
  buildWorkspaceThemeStylesheet,
  createBundledSiteAccess,
  createCurrentAssetReader,
  createDocsSourceAccess
} from "@scriptorium/content";
import {
  createRuntimeWarmup,
  createRuntimeSnapshotController,
  getLocalProjectRoot,
  getRuntimeConfig,
  getRuntimePaths
} from "@scriptorium/runtime";
import {
  createGitCliStageRepository,
  syncGitCliRepository
} from "@scriptorium/source-git";
import { createLocalStageRepository } from "@scriptorium/source-local";
import { createSearchRuntime } from "@/search-runtime";

function isRuntimeBundleEnabled() {
  return getRuntimeConfig().source.type === "git";
}

const runtimeSnapshotController = createRuntimeSnapshotController(async (repoDir, config) => {
  if (!config.source.target) {
    throw new Error("Runtime source.target is not configured for git source mode.");
  }

  await syncGitCliRepository({
    repoDir,
    repoUrl: config.source.target,
    defaultBranch: config.source.defaultBranch,
    authToken: config.source.auth?.token,
    authUsername: config.source.auth?.username
  });

  return createGitCliStageRepository(repoDir);
});

async function ensureLocalBundle(projectRoot: string) {
  return buildProjectBundle({
    projectRoot,
    repository: createLocalStageRepository(projectRoot)
  });
}

const bundledSiteAccess = createBundledSiteAccess({
  getLocalProjectRoot,
  isRuntimeBundleEnabled,
  ensureRuntimeSnapshot: runtimeSnapshotController.ensureRuntimeSnapshot,
  ensureLocalBundle,
  getRuntimeBundleDir: () => getRuntimePaths().bundleDir
});

const docsSourceAccess = createDocsSourceAccess(bundledSiteAccess.getBundledSite);
const readCurrentAsset = createCurrentAssetReader({
  getLocalProjectRoot,
  isRuntimeBundleEnabled,
  getRuntimeBundleDir: () => getRuntimePaths().bundleDir
});
const runtimeWarmup = createRuntimeWarmup({
  isRuntimeBundleEnabled,
  getRuntimeConfig,
  ensureRuntimeSnapshot: runtimeSnapshotController.ensureRuntimeSnapshot
});
const searchRuntime = createSearchRuntime(docsSourceAccess.getSource);

async function warmRuntimeContent() {
  await docsSourceAccess.getSource();
  await searchRuntime.warmSearchIndex();
}

async function refreshRuntimeContent() {
  await runtimeSnapshotController.refreshRuntimeSnapshot();
  bundledSiteAccess.invalidate();
  docsSourceAccess.invalidate();
  searchRuntime.invalidate();
  await warmRuntimeContent();
}

const handleWebhookTrigger = createWebhookTriggerHandler({
  refresh: refreshRuntimeContent,
  getSecret: () => getRuntimeConfig().triggers?.webhook?.secret
});

async function ensureRuntimeReady() {
  runtimeWarmup.startBackgroundWarmup();
  await warmRuntimeContent();
}

export { buildWorkspaceThemeStylesheet, getRefMetadata, getRefUrl, handleWebhookTrigger, readCurrentAsset };
export const { ensureRuntimeSnapshot } = runtimeSnapshotController;
export const refreshRuntimeSnapshot = refreshRuntimeContent;
export const { getReadiness: getRuntimeReadiness, startBackgroundWarmup: startRuntimeWarmup } = runtimeWarmup;
export const { searchHandler, warmSearchIndex } = searchRuntime;
export { ensureRuntimeReady };
export const { getBundledSite, getProjectConfig, getPublishedVersions } = bundledSiteAccess;
export const { getSource } = docsSourceAccess;
export { getLocalProjectRoot, getRuntimeConfig, getRuntimePaths };
