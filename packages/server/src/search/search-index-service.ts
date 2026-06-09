import { readFile } from "node:fs/promises";
import type { RuntimeStatusService } from "../status-service";
import type { ActiveContentService } from "../content/active-content-service";

export class SearchIndexService {
  constructor(
    private readonly runtimeStatusService: RuntimeStatusService,
    private readonly activeContentService: ActiveContentService
  ) {}

  async getSearchIndex(refSlug?: string) {
    const snapshot = await this.runtimeStatusService.getSnapshot();
    if (!snapshot.activeGenerationId || !snapshot.preparedAt) {
      return null;
    }

    let refName: string;
    try {
      refName = await this.activeContentService.resolveRefName(refSlug);
    } catch {
      return undefined;
    }

    const active = await this.activeContentService.getActiveBundle();
    const bundle = await active.bundle;
    const version = bundle.versions.find((entry) => entry.name === refName);
    if (!version) {
      return undefined;
    }

    return {
      body: await readFile(version.searchIndexPath, "utf8"),
      etag: `"${snapshot.activeGenerationId}:${version.slug}"`,
      refSlug: version.slug
    };
  }
}
