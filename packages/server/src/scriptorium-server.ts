import { resolveBundlingCaptions } from "@scriptorium/server-api";
import { ActiveContentService } from "./content/active-content-service";
import { CurrentAssetService } from "./content/current-asset-service";
import { RefSourceService } from "./content/ref-source-service";
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
  private readonly refSourceService = new RefSourceService();
  private readonly currentAssetService: CurrentAssetService;
  private readonly searchIndexService: SearchIndexService;
  private readonly healthController = new HealthController();
  private readonly readinessController: ReadinessController;
  private readonly searchController: SearchController;

  constructor(private readonly options: ScriptoriumServerOptions) {
    this.runtimeStatusService = new RuntimeStatusService(options.stateFile);
    this.activeContentService = new ActiveContentService(this.runtimeStatusService, options.generationsDir);
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

  async getSource(refName?: string) {
    const active = await this.activeContentService.getActiveBundle();
    const bundle = await active.bundle;
    const resolvedRef = await this.activeContentService.resolveRefName(refName);
    return this.refSourceService.getSource(bundle, resolvedRef);
  }

  async getSidebarTree(refName: string) {
    const active = await this.activeContentService.getActiveBundle();
    const bundle = await active.bundle;
    return this.refSourceService.getSidebarTree(bundle, refName);
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
