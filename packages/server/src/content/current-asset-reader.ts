import path from "node:path";
import { readFile } from "node:fs/promises";

export function createCurrentAssetReader(options: {
  getCurrentAssetsDir: (projectRoot?: string) => string | Promise<string>;
}) {
  return async function readCurrentAsset(assetSegments: string[], projectRoot?: string) {
    const baseDir = await options.getCurrentAssetsDir(projectRoot);
    const assetPath = path.join(baseDir, ...assetSegments);
    return readFile(assetPath);
  };
}
