import path from "node:path";
import { readFile } from "node:fs/promises";

export function createCurrentAssetReader(options: {
  getLocalProjectRoot: () => string;
  isRuntimeBundleEnabled: () => boolean;
  getRuntimeBundleDir: () => string;
}) {
  return async function readCurrentAsset(assetSegments: string[], projectRoot = options.getLocalProjectRoot()) {
    const baseDir = options.isRuntimeBundleEnabled()
      ? path.join(options.getRuntimeBundleDir(), "current", "assets")
      : path.join(projectRoot, ".scriptorium", "bundle", "current", "assets");
    const assetPath = path.join(baseDir, ...assetSegments);
    return readFile(assetPath);
  };
}
