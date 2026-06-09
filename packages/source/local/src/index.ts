import type { SourceAdapter } from "@scriptorium/source-api";

export { createLocalContractWatcher } from "./contract-watcher";
export { createLocalStageRepository } from "./local-stage-repository";

import { createLocalContractWatcher } from "./contract-watcher";
import { createLocalStageRepository } from "./local-stage-repository";

export function createLocalSourceAdapter(options: {
  projectRoot: string;
}): SourceAdapter {
  return {
    type: "local",
    async prepareRepository() {
      return {
        projectRoot: options.projectRoot,
        repository: createLocalStageRepository(options.projectRoot)
      };
    },
    startBackgroundServices(callbacks) {
      return createLocalContractWatcher({
        projectRoot: options.projectRoot,
        onChange() {
          void callbacks.requestPrepare();
        }
      });
    }
  };
}
