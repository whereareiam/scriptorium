import type { ScriptoriumProjectConfig } from "@scriptorium/core";
import type { BundleManifest } from "@scriptorium/bundle";

export interface BundledSiteAccess {
  getBundledSite: (projectRoot?: string) => Promise<BundleManifest>;
  getProjectConfig: (projectRoot?: string) => Promise<ScriptoriumProjectConfig>;
  getPublishedVersions: (projectRoot?: string) => Promise<BundleManifest["versions"]>;
  invalidate: (projectRoot?: string) => void;
}
