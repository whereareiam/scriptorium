import { cp, mkdir } from "node:fs/promises";
import path from "node:path";
import { resolveProjectPaths } from "@scriptorium/core";
import type { BundledVersion } from "../models/bundled-version";

export async function exportWorkingTreeVersion(projectRoot: string, versionName: string, outputDir: string) {
  const versionRoot = path.join(outputDir, "versions", versionName);
  const { configPath, docsAssetsDir, docsContentDir } = resolveProjectPaths(projectRoot);

  await mkdir(versionRoot, { recursive: true });
  const bundledContentDir = path.join(versionRoot, "content");
  await cp(docsContentDir, bundledContentDir, { recursive: true });

  try {
    await cp(docsAssetsDir, path.join(versionRoot, "assets"), { recursive: true });
  } catch {
    await mkdir(path.join(versionRoot, "assets"), { recursive: true });
  }

  await cp(configPath, path.join(versionRoot, "scriptorium.project.json"));

  return {
    name: versionName,
    kind: "branch",
    fullName: `working-tree/${versionName}`,
    objectName: "working-tree",
    contentDir: path.join(versionRoot, "content"),
    assetsDir: path.join(versionRoot, "assets"),
    configPath: path.join(versionRoot, "scriptorium.project.json")
  } satisfies BundledVersion;
}
