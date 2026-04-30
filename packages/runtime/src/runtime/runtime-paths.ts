import path from "node:path";
import { getRuntimeConfig } from "./runtime-config";

export function getRuntimePaths() {
  const config = getRuntimeConfig();
  const repoDir = path.join(config.runtime.dataDir, "repo");
  const bundleDir = path.join(config.runtime.dataDir, "bundle");
  const stateFile = path.join(config.runtime.dataDir, "state.json");

  return {
    config,
    repoDir,
    bundleDir,
    stateFile
  };
}
