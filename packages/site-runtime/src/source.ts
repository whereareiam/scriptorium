import path from "node:path";
import { readFile } from "node:fs/promises";
import { cache } from "react";
import { localMd, type LocalMarkdownPage } from "@fumadocs/local-md";
import { loader, type MetaData, type StaticSource, type VirtualFile } from "fumadocs-core/source";
import type { Root as PageTreeRoot, Folder as PageTreeFolder } from "fumadocs-core/page-tree";
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons";
import { getRefMetadata, loadProjectConfig, type ScriptoriumProjectConfig } from "./config";
import { ensureRuntimeSnapshot, getRuntimePaths } from "./runtime-sync";
import { readStageManifest, type StageManifest } from "./staging";

type CombinedPageData = LocalMarkdownPage<Record<string, unknown>, Record<string, unknown>>;
type CombinedMetaData = MetaData;
type CombinedSource = StaticSource<{
  pageData: CombinedPageData;
  metaData: CombinedMetaData;
}>;
type CombinedVirtualFile = VirtualFile<{
  pageData: CombinedPageData;
  metaData: CombinedMetaData;
}>;

export const getStagedSite = cache(async (projectRoot = process.cwd()) => {
  if (process.env.SCRIPTORIUM_REPO_URL) {
    await ensureRuntimeSnapshot();
    return readStageManifest(process.cwd(), getRuntimePaths().stagedDir);
  }

  try {
    return await readStageManifest(projectRoot);
  } catch {
    return createFallbackManifest(projectRoot);
  }
});

export const getProjectConfig = cache(async (projectRoot = process.cwd()) => {
  const manifest = await getStagedSite(projectRoot);
  return manifest.project;
});

export const getPublishedRefs = cache(async (projectRoot = process.cwd()) => {
  const manifest = await getStagedSite(projectRoot);
  return manifest.refs;
});

export function toRefSlug(refName: string) {
  return refName.replace(/[^A-Za-z0-9._-]+/g, "~");
}

export const getSource = cache(async (projectRoot = process.cwd()) => {
  const manifest = await getStagedSite(projectRoot);
  const files: CombinedVirtualFile[] = [];

  for (const ref of manifest.refs) {
    const docs = localMd({
      dir: ref.contentDir
    });
    const staticSource = await docs.staticSource();
    files.push(...prefixRefFiles(staticSource, manifest.project, ref.name));
  }

  const source = loader({ files }, {
    baseUrl: "/docs",
    plugins: [lucideIconsPlugin()]
  });

  return { source };
});

export async function readCurrentAsset(projectRoot: string, assetSegments: string[]) {
  const baseDir = process.env.SCRIPTORIUM_REPO_URL
    ? path.join(getRuntimePaths().stagedDir, "current", "assets")
    : path.join(projectRoot, ".scriptorium", "staged", "current", "assets");
  const assetPath = path.join(baseDir, ...assetSegments);
  return readFile(assetPath);
}

export type ProjectConfig = ScriptoriumProjectConfig;

export function getRefUrl(source: Awaited<ReturnType<typeof getSource>>["source"], refName: string) {
  const refSlug = toRefSlug(refName);
  const folder = findRefFolder(source.getPageTree(), refSlug);

  if (folder?.index?.url) {
    return folder.index.url;
  }

  const page = source.getPages().find((entry) => entry.slugs[0] === refSlug);
  if (page) {
    return page.url;
  }

  return `/docs/${refSlug}`;
}

function prefixRefFiles(source: CombinedSource, project: ScriptoriumProjectConfig, refName: string) {
  const refSlug = toRefSlug(refName);
  const refLabel = getRefMetadata(project, refName).label;

  return source.files.map((file) => prefixRefFile(file, refSlug, refLabel));
}

function prefixRefFile(file: CombinedVirtualFile, refSlug: string, refLabel: string): CombinedVirtualFile {
  if (file.type === "meta" && file.path === "meta.json") {
    const { description: _description, ...restData } = file.data;

    return {
      ...file,
      path: `${refSlug}/meta.json`,
      data: {
        ...restData,
        title: refLabel,
        root: true
      }
    };
  }

  return {
    ...file,
    path: `${refSlug}/${file.path}`
  };
}

function findRefFolder(tree: PageTreeRoot, refSlug: string) {
  return tree.children.find((node): node is PageTreeFolder => {
    return node.type === "folder" && node.$ref === `${refSlug}/meta.json`;
  });
}

async function createFallbackManifest(projectRoot: string): Promise<StageManifest> {
  const project = await loadProjectConfig(projectRoot);

  return {
    generatedAt: new Date(0).toISOString(),
    projectRoot,
    repoRoot: projectRoot,
    project,
    refs: []
  };
}
