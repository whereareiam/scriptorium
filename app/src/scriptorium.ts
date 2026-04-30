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
  createRuntimeSnapshotController,
  getLocalProjectRoot,
  getRuntimeConfig,
  getRuntimePaths
} from "@scriptorium/runtime";
import {
  createGitCliStageRepository,
  createIsomorphicGitStageRepository,
  syncIsomorphicGitRepository
} from "@scriptorium/source-git";

function isRuntimeBundleEnabled() {
  return getRuntimeConfig().source.type === "git";
}

const runtimeSnapshotController = createRuntimeSnapshotController(async (repoDir, config) => {
  if (!config.source.target) {
    throw new Error("Runtime source.target is not configured for git source mode.");
  }

  await syncIsomorphicGitRepository({
    repoDir,
    repoUrl: config.source.target,
    defaultBranch: config.source.defaultBranch,
    authToken: config.source.auth?.token,
    authUsername: config.source.auth?.username
  });

  return createIsomorphicGitStageRepository(repoDir);
});

async function ensureLocalBundle(projectRoot: string) {
  return buildProjectBundle({
    projectRoot,
    repository: createGitCliStageRepository(projectRoot)
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
const handleWebhookTrigger = createWebhookTriggerHandler({
  refresh: runtimeSnapshotController.refreshRuntimeSnapshot,
  getSecret: () => getRuntimeConfig().triggers?.webhook?.secret
});

export { buildWorkspaceThemeStylesheet, getRefMetadata, getRefUrl, handleWebhookTrigger, readCurrentAsset };
export const { ensureRuntimeSnapshot, refreshRuntimeSnapshot } = runtimeSnapshotController;
export const { getBundledSite, getProjectConfig, getPublishedVersions } = bundledSiteAccess;
export const { getSource } = docsSourceAccess;
export { getLocalProjectRoot, getRuntimeConfig, getRuntimePaths };
