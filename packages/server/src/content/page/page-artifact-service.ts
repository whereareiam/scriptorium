import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
  ServedBundleManifest,
  ServedBundleVersion,
  ServedPageArtifact,
  ServedPageIndexEntry,
  ServedPageTreeRoot
} from "@scriptorium/server-api";
import { toRefSlug } from "@scriptorium/server-api";
import type { ActiveContentService } from "../active-content-service";

interface CachedJsonValue<T> {
  generationId: string;
  versionName: string;
  value: Promise<T>;
}

interface StoredPageIndex {
  entries: ServedPageIndexEntry[];
}

export class PageArtifactService {
  private readonly pageTrees = new Map<string, CachedJsonValue<ServedPageTreeRoot>>();
  private readonly pageIndexes = new Map<string, CachedJsonValue<StoredPageIndex>>();
  private readonly pageArtifacts = new Map<string, Promise<ServedPageArtifact>>();
  private readonly pageArtifactsLru: string[] = [];

  constructor(private readonly activeContentService: ActiveContentService) {}

  async getSidebarTree(refNameOrSlug: string) {
    const { generationId, bundle } = await this.getActiveBundleAndManifest();
    const refName = await this.activeContentService.resolveRefName(refNameOrSlug);
    const version = resolveVersion(bundle, refName);
    const cacheKey = `${generationId}:${version.name}:tree`;
    const cached = this.pageTrees.get(cacheKey);
    if (cached) {
      return cached.value;
    }

    const value = this.readJson<ServedPageTreeRoot>(version.pageTreePath);
    this.pageTrees.set(cacheKey, {
      generationId,
      versionName: version.name,
      value
    });
    this.evictGenerationCaches(generationId);
    return value;
  }

  async getPage(routeSegments: string[]) {
    if (routeSegments.length === 0) {
      return null;
    }

    const { generationId, bundle } = await this.getActiveBundleAndManifest();
    const refName = await this.activeContentService.resolveRefName(routeSegments[0]);
    const version = resolveVersion(bundle, refName);
    const index = await this.getPageIndex(version);
    const routeKey = toRouteKey(routeSegments.slice(1));
    const entry = index.entries.find((candidate) => toRouteKey(candidate.routeSegments.slice(1)) === routeKey);
    if (!entry) {
      return null;
    }

    const cacheKey = `${generationId}:${routeSegments[0]}:${routeKey}`;
    const cachedArtifact = this.pageArtifacts.get(cacheKey);
    if (cachedArtifact) {
      this.bumpArtifact(cacheKey);
      return cachedArtifact;
    }

    const artifactPath = path.join(version.pageArtifactsDir, entry.artifactPath);
    const artifact = this.readJson<ServedPageArtifact>(artifactPath);
    this.pageArtifacts.set(cacheKey, artifact);
    this.bumpArtifact(cacheKey);
    this.evictArtifacts();
    return artifact;
  }

  async resolveHref(refNameOrSlug: string, sourcePath: string, href: string) {
    if (!href.startsWith("./") && !href.startsWith("../")) {
      return href;
    }

    const { bundle } = await this.getActiveBundleAndManifest();
    const refName = await this.activeContentService.resolveRefName(refNameOrSlug);
    const version = resolveVersion(bundle, refName);
    const index = await this.getPageIndex(version);
    const [value, hash] = href.split("#", 2);
    const resolvedSourcePath = path.posix.normalize(path.posix.join(path.posix.dirname(sourcePath), value));
    const target = index.entries.find((entry) => entry.sourcePath === resolvedSourcePath);
    if (!target) {
      return href;
    }

    return hash ? `${target.url}#${hash}` : target.url;
  }

  private async getPageIndex(version: ServedBundleVersion) {
    const active = await this.activeContentService.getActiveBundle();
    const cacheKey = `${active.generationId}:${version.name}:index`;
    const cached = this.pageIndexes.get(cacheKey);
    if (cached) {
      return cached.value;
    }

    const value = this.readJson<StoredPageIndex>(version.pageIndexPath);
    this.pageIndexes.set(cacheKey, {
      generationId: active.generationId,
      versionName: version.name,
      value
    });
    this.evictGenerationCaches(active.generationId);
    return value;
  }

  private async getActiveBundleAndManifest() {
    const active = await this.activeContentService.getActiveBundle();
    return {
      generationId: active.generationId,
      bundle: await active.bundle
    };
  }

  private async readJson<T>(filePath: string) {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  }

  private evictGenerationCaches(activeGenerationId: string) {
    for (const [key, cache] of this.pageTrees.entries()) {
      if (cache.generationId !== activeGenerationId) {
        this.pageTrees.delete(key);
      }
    }

    for (const [key, cache] of this.pageIndexes.entries()) {
      if (cache.generationId !== activeGenerationId) {
        this.pageIndexes.delete(key);
      }
    }

    for (const key of this.pageArtifacts.keys()) {
      if (!key.startsWith(`${activeGenerationId}:`)) {
        this.pageArtifacts.delete(key);
        const index = this.pageArtifactsLru.indexOf(key);
        if (index >= 0) {
          this.pageArtifactsLru.splice(index, 1);
        }
      }
    }
  }

  private bumpArtifact(cacheKey: string) {
    const index = this.pageArtifactsLru.indexOf(cacheKey);
    if (index >= 0) {
      this.pageArtifactsLru.splice(index, 1);
    }

    this.pageArtifactsLru.push(cacheKey);
  }

  private evictArtifacts() {
    while (this.pageArtifactsLru.length > 32) {
      const removed = this.pageArtifactsLru.shift();
      if (removed) {
        this.pageArtifacts.delete(removed);
      }
    }
  }
}

function resolveVersion(bundle: ServedBundleManifest, refName: string) {
  const version = bundle.versions.find((entry) => entry.name === refName || toRefSlug(entry.name) === refName);
  if (!version) {
    throw new Error(`Unknown bundled ref "${refName}".`);
  }

  return version;
}

function toRouteKey(routeSegments: string[]) {
  return routeSegments.join("/");
}
