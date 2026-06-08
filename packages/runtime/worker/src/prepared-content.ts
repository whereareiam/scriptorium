import { readFile } from "node:fs/promises";
import path from "node:path";
import { createSearchAPI, type AdvancedIndex } from "fumadocs-core/search/server";
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

export async function collectPreparedSearchIndexes(bundle: BundleManifest) {
  const indexes: AdvancedIndex[] = [];

  for (const version of bundle.versions) {
    const source = await loadPreparedSource({
      ...bundle,
      versions: [version]
    });

    for (const page of source.getPages()) {
      const index = await buildAdvancedIndex(page);
      indexes.push({
        ...index,
        breadcrumbs: index.breadcrumbs ?? buildBreadcrumbs(source, page)
      });
    }
  }

  return indexes;
}

export async function exportPreparedSearchIndex(indexes: AdvancedIndex[]) {
  const searchServer = createSearchAPI("advanced", {
    indexes
  });
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

async function buildAdvancedIndex(page: DocsSource["getPages"] extends () => infer Pages
  ? Pages extends Array<infer Page> ? Page : never
  : never): Promise<AdvancedIndex> {
  let structuredData: AdvancedIndex["structuredData"] | undefined;

  if ("structuredData" in page.data) {
    structuredData = typeof page.data.structuredData === "function"
      ? await page.data.structuredData()
      : page.data.structuredData;
  } else if ("load" in page.data && typeof page.data.load === "function") {
    structuredData = (await page.data.load()).structuredData;
  }

  if (!structuredData) {
    throw new Error("Cannot find structured data from page, please define the page to index function.");
  }

  return {
    title: page.data.title ?? fileNameWithoutExtension(page.path),
    description: page.data.description,
    url: page.url,
    id: page.url,
    structuredData
  };
}

function buildBreadcrumbs(source: DocsSource, page: ReturnType<DocsSource["getPages"]>[number]) {
  const pageTree = source.getPageTree(page.locale);
  const path = findPageTreePath(pageTree.children, (node) => node.type === "page" && node.url === page.url);
  if (!path) {
    return undefined;
  }

  const breadcrumbs: string[] = [];
  path.pop();

  if (typeof pageTree.name === "string" && pageTree.name.length > 0) {
    breadcrumbs.push(pageTree.name);
  }

  for (const segment of path) {
    if (typeof segment.name !== "string" || segment.name.length === 0) {
      continue;
    }

    breadcrumbs.push(segment.name);
  }

  return breadcrumbs;
}

function findPageTreePath<T>(nodes: T[], predicate: (node: T) => boolean, path: T[] = []): T[] | undefined {
  for (const node of nodes) {
    path.push(node);

    if (predicate(node)) {
      return [...path];
    }

    const children = typeof node === "object" && node !== null && "children" in node
      ? (node as { children?: T[] }).children
      : undefined;
    if (children && children.length > 0) {
      const result = findPageTreePath(children, predicate, path);
      if (result) {
        return result;
      }
    }

    path.pop();
  }

  return undefined;
}

function fileNameWithoutExtension(filePath: string) {
  const extension = path.extname(filePath);
  return path.basename(filePath, extension);
}
