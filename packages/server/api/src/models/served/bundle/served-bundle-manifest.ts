import type { ScriptoriumProjectConfig } from "../../scriptorium-project-config";
import type { ServedBundleVersion } from "./served-bundle-version";

export interface ServedBundleManifest {
  generatedAt: string;
  project: ScriptoriumProjectConfig;
  currentAssetsDir: string;
  versions: ServedBundleVersion[];
}
