import { cp, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import { resolveProjectPaths } from "@scriptorium/core";

export async function copyCurrentAssets(projectRoot: string, outputDir: string) {
  const { docsAssetsDir } = resolveProjectPaths(projectRoot);
  const currentAssetsDir = path.join(outputDir, "current", "assets");

  try {
    const assetStats = await stat(docsAssetsDir);
    if (!assetStats.isDirectory()) return currentAssetsDir;
  } catch {
    return currentAssetsDir;
  }

  await mkdir(path.dirname(currentAssetsDir), { recursive: true });
  await cp(docsAssetsDir, currentAssetsDir, { recursive: true });

  return currentAssetsDir;
}
