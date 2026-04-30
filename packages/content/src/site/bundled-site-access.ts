import { cache } from "react";
import { readBundleManifest } from "@scriptorium/bundle";
import type { BundledSiteAccess } from "../models/bundled-site-access";

export function createBundledSiteAccess(options: {
  getLocalProjectRoot: () => string;
  isRuntimeBundleEnabled: () => boolean;
  ensureRuntimeSnapshot: () => Promise<void>;
  ensureLocalBundle: (projectRoot: string) => Promise<unknown>;
  getRuntimeBundleDir: () => string;
}): BundledSiteAccess {
  const getBundledSite = cache(async (projectRoot = options.getLocalProjectRoot()) => {
    if (options.isRuntimeBundleEnabled()) {
      await options.ensureRuntimeSnapshot();
      return readBundleManifest(projectRoot, options.getRuntimeBundleDir());
    }

    await options.ensureLocalBundle(projectRoot);
    return readBundleManifest(projectRoot);
  });

  const getProjectConfig = cache(async (projectRoot = options.getLocalProjectRoot()) => {
    const bundle = await getBundledSite(projectRoot);
    return bundle.project;
  });

  const getPublishedVersions = cache(async (projectRoot = options.getLocalProjectRoot()) => {
    const bundle = await getBundledSite(projectRoot);
    return bundle.versions;
  });

  return {
    getBundledSite,
    getProjectConfig,
    getPublishedVersions
  };
}
