import type { ScriptoriumProjectConfig } from "./models/scriptorium-project-config";
import type { ServedBundleManifest } from "./models/served/bundle/served-bundle-manifest";

export interface ServerContentReader {
  getActiveManifest(): Promise<ServedBundleManifest>;
  getProjectConfig(): Promise<ScriptoriumProjectConfig>;
}
