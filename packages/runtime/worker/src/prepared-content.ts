import { readFile } from "node:fs/promises";
import path from "node:path";
import { createFromSource } from "fumadocs-core/search/server";
import { readBundleManifest, type BundleManifest } from "@scriptorium/bundle";
import {
  createDocsSourceAccess,
  type DocsSource
} from "@scriptorium/content";
import { getLocalProjectRoot, getRuntimePaths } from "@scriptorium/runtime";

export interface PreparedRuntimeContent {
  generationId: string;
  generationDir: string;
  bundle: BundleManifest;
  source: DocsSource;
  currentAssetsDir: string;
  searchIndexPath: string;
}

export function resolveGenerationPaths(generationId: string) {
  const generationDir = path.join(getRuntimePaths().generationsDir, generationId);
  const bundleDir = path.join(generationDir, "bundle");
  const searchIndexPath = path.join(generationDir, "search-index.json");

  return {
    generationDir,
    bundleDir,
    searchIndexPath,
    currentAssetsDir: path.join(bundleDir, "current", "assets")
  };
}

export async function loadPreparedSource(bundle: BundleManifest) {
  const sourceAccess = createDocsSourceAccess(async () => bundle);
  const { source } = await sourceAccess.getSource(bundle.projectRoot);
  return source;
}

export async function exportPreparedSearchIndex(source: DocsSource) {
  const searchServer = createFromSource(source);
  const response = await searchServer.staticGET();
  return response.text();
}

export async function hydratePreparedContent(generationId: string) {
  const { generationDir, bundleDir, searchIndexPath, currentAssetsDir } = resolveGenerationPaths(generationId);
  const bundle = await readBundleManifest(getLocalProjectRoot(), bundleDir);
  const source = await loadPreparedSource(bundle);

  return {
    generationId,
    generationDir,
    bundle,
    source,
    currentAssetsDir,
    searchIndexPath
  } satisfies PreparedRuntimeContent;
}

export async function readPreparedSearchIndex(generationId: string) {
  const { searchIndexPath } = resolveGenerationPaths(generationId);
  return readFile(searchIndexPath, "utf8");
}
