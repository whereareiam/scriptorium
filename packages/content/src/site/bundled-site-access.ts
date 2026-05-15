import { readBundleManifest } from "@scriptorium/bundle";
import type { BundledSiteAccess } from "../models/bundled-site-access";

export function createBundledSiteAccess(options: {
  getLocalProjectRoot: () => string;
  isRuntimeBundleEnabled: () => boolean;
  ensureRuntimeSnapshot: () => Promise<void>;
  ensureLocalBundle: (projectRoot: string) => Promise<unknown>;
  getRuntimeBundleDir: () => string;
  readBundleManifest?: typeof readBundleManifest;
}): BundledSiteAccess {
  const bundledSites = new Map<string, Promise<Awaited<ReturnType<BundledSiteAccess["getBundledSite"]>>>>();
  const projectConfigs = new Map<string, Promise<Awaited<ReturnType<BundledSiteAccess["getProjectConfig"]>>>>();
  const publishedVersions = new Map<string, Promise<Awaited<ReturnType<BundledSiteAccess["getPublishedVersions"]>>>>();

  function normalizeProjectRoot(projectRoot = options.getLocalProjectRoot()) {
    return projectRoot;
  }

  function getBundledSite(projectRoot?: string) {
    const resolvedProjectRoot = normalizeProjectRoot(projectRoot);
    let bundle = bundledSites.get(resolvedProjectRoot);
    if (bundle) return bundle;

    bundle = loadBundledSite(resolvedProjectRoot);
    bundledSites.set(resolvedProjectRoot, bundle);
    return bundle;
  }

  async function loadBundledSite(projectRoot: string) {
    const loadManifest = options.readBundleManifest ?? readBundleManifest;

    if (options.isRuntimeBundleEnabled()) {
      await options.ensureRuntimeSnapshot();
      return loadManifest(projectRoot, options.getRuntimeBundleDir());
    }

    await options.ensureLocalBundle(projectRoot);
    return loadManifest(projectRoot);
  }

  function getProjectConfig(projectRoot?: string) {
    const resolvedProjectRoot = normalizeProjectRoot(projectRoot);
    let projectConfig = projectConfigs.get(resolvedProjectRoot);
    if (projectConfig) return projectConfig;

    projectConfig = getBundledSite(resolvedProjectRoot).then((bundle) => bundle.project);
    projectConfigs.set(resolvedProjectRoot, projectConfig);
    return projectConfig;
  }

  function getPublishedVersions(projectRoot?: string) {
    const resolvedProjectRoot = normalizeProjectRoot(projectRoot);
    let versions = publishedVersions.get(resolvedProjectRoot);
    if (versions) return versions;

    versions = getBundledSite(resolvedProjectRoot).then((bundle) => bundle.versions);
    publishedVersions.set(resolvedProjectRoot, versions);
    return versions;
  }

  function invalidate(projectRoot?: string) {
    if (projectRoot) {
      bundledSites.delete(projectRoot);
      projectConfigs.delete(projectRoot);
      publishedVersions.delete(projectRoot);
      return;
    }

    bundledSites.clear();
    projectConfigs.clear();
    publishedVersions.clear();
  }

  return {
    getBundledSite,
    getProjectConfig,
    getPublishedVersions,
    invalidate
  };
}
