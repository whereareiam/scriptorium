import type { ActiveContentService } from "./active-content-service";
import { createCurrentAssetReader } from "./current-asset-reader";

export class CurrentAssetService {
  private readonly readAsset;

  constructor(private readonly activeContentService: ActiveContentService) {
    this.readAsset = createCurrentAssetReader({
      getCurrentAssetsDir: async () => {
        const active = await this.activeContentService.getActiveBundle();
        return (await active.bundle).currentAssetsDir;
      }
    });
  }

  readCurrentAsset(assetSegments: string[]) {
    return this.readAsset(assetSegments);
  }
}
