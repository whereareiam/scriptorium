import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
  PublishedVersion,
  ServedBundleManifest
} from "@scriptorium/server-api";
import { toRefSlug } from "@scriptorium/server-api";
import type { RuntimeStatusService } from "../status-service";

interface ActiveBundleCache {
  generationId: string;
  bundle: Promise<ServedBundleManifest>;
}

export class ActiveContentService {
  private cache: ActiveBundleCache | null = null;

  constructor(
    private readonly runtimeStatusService: RuntimeStatusService,
    private readonly generationsDir: string
  ) {}

  async getActiveBundle(): Promise<ActiveBundleCache> {
    const snapshot = await this.runtimeStatusService.getSnapshot();
    if (!snapshot.activeGenerationId) {
      throw new Error("Runtime content is not ready yet.");
    }

    const cached = this.cache;
    if (cached?.generationId === snapshot.activeGenerationId)
      return cached;

    const generationDir = path.join(this.generationsDir, snapshot.activeGenerationId);
    const bundleDir = path.join(generationDir, "bundle");
    const nextCache = {
      generationId: snapshot.activeGenerationId,
      bundle: this.readServedBundleManifest(bundleDir)
    } satisfies ActiveBundleCache;
    this.cache = nextCache;
    return nextCache;
  }

  async getProjectConfig() {
    const active = await this.getActiveBundle();
    return (await active.bundle).project;
  }

  async getPublishedVersions() {
    return (await this.getBundledVersions()).map(toPublishedVersion);
  }

  async resolveRefName(refNameOrSlug?: string) {
    const versions = await this.getBundledVersions();
    if (!refNameOrSlug) {
      const project = await this.getProjectConfig();
      return project.versions.home;
    }

    const exact = versions.find((version) => version.name === refNameOrSlug);
    if (exact) {
      return exact.name;
    }

    const bySlug = versions.find((version) => toRefSlug(version.name) === refNameOrSlug);
    if (!bySlug) {
      throw new Error(`Unknown ref "${refNameOrSlug}".`);
    }

    return bySlug.name;
  }

  private async getBundledVersions() {
    const active = await this.getActiveBundle();
    return (await active.bundle).versions;
  }

  private async readServedBundleManifest(bundleDir: string) {
    const manifestPath = path.join(bundleDir, "manifest.json");
    const raw = await readFile(manifestPath, "utf8");

    return JSON.parse(raw) as ServedBundleManifest;
  }
}

function toPublishedVersion(version: ServedBundleManifest["versions"][number]): PublishedVersion {
  return {
    name: version.name,
    kind: version.kind
  };
}
