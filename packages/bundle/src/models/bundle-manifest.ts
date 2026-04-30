import type { ScriptoriumProjectConfig } from "@scriptorium/core";
import type { BundledVersion } from "./bundled-version";

export interface BundleManifest {
  generatedAt: string;
  projectRoot: string;
  repoRoot: string;
  project: ScriptoriumProjectConfig;
  versions: BundledVersion[];
}
