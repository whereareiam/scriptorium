import { resolveBundlingCaptions } from "@scriptorium/server-api";
import { ActiveContentService } from "./content/active-content-service";
import { CurrentAssetService } from "./content/current-asset-service";
import { PageArtifactService } from "./content/page/page-artifact-service";
import { renderPreparedPageArtifact } from "./content/page/page-runtime-renderer";
import { HealthController } from "./controllers/health-controller";
import { ReadinessController } from "./controllers/readiness-controller";
import { SearchController } from "./controllers/search-controller";
import { SearchIndexService } from "./search/search-index-service";
import { RuntimeStatusService } from "./status-service";

export interface ScriptoriumServerOptions {
  generationsDir: string;
  stateFile: string;
}

export class ScriptoriumServer {
  private readonly runtimeStatusService: RuntimeStatusService;
  private readonly activeContentService: ActiveContentService;
  private readonly pageArtifactService: PageArtifactService;
  private readonly currentAssetService: CurrentAssetService;
  private readonly searchIndexService: SearchIndexService;
  private readonly healthController = new HealthController();
  private readonly readinessController: ReadinessController;
  private readonly searchController: SearchController;

  constructor(private readonly options: ScriptoriumServerOptions) {
    this.runtimeStatusService = new RuntimeStatusService(options.stateFile);
    this.activeContentService = new ActiveContentService(this.runtimeStatusService, options.generationsDir);
    this.pageArtifactService = new PageArtifactService(this.activeContentService);
    this.currentAssetService = new CurrentAssetService(this.activeContentService);
    this.searchIndexService = new SearchIndexService(this.runtimeStatusService, this.activeContentService);
    this.readinessController = new ReadinessController(this.runtimeStatusService);
    this.searchController = new SearchController(this.runtimeStatusService, this.searchIndexService);
  }

  async getReadiness() {
    return this.runtimeStatusService.getReadinessResponse();
  }

  async getBundlingCaptions() {
    try {
      const project = await this.getProjectConfig();
      return resolveBundlingCaptions(project);
    } catch {
      return resolveBundlingCaptions(null);
    }
  }

  async getProjectConfig() {
    return this.activeContentService.getProjectConfig();
  }

  async getPublishedVersions() {
    return this.activeContentService.getPublishedVersions();
  }

  async getPreparedPage(slugSegments: string[]) {
    return this.pageArtifactService.getPage(slugSegments);
  }

  async getSidebarTree(refName: string) {
    return this.pageArtifactService.getSidebarTree(refName);
  }

  async resolvePreparedPageHref(refNameOrSlug: string, sourcePath: string, href: string) {
    return this.pageArtifactService.resolveHref(refNameOrSlug, sourcePath, href);
  }

  async readCurrentAsset(assetSegments: string[]) {
    return this.currentAssetService.readCurrentAsset(assetSegments);
  }

  async getPreparedSearchIndex(refSlug: string) {
    const index = await this.searchIndexService.getSearchIndex(refSlug);
    return index?.body ?? null;
  }

  handleHealthRequest() {
    return this.healthController.handle();
  }

  handleReadinessRequest() {
    return this.readinessController.handle();
  }

  handleSearchRequest(request: Request) {
    return this.searchController.handle(request);
  }
}

export function createScriptoriumServer(options: ScriptoriumServerOptions) {
  return new ScriptoriumServer(options);
}

export { renderPreparedPageArtifact };
