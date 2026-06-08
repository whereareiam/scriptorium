import { loadProjectConfig } from "@scriptorium/core";
import type { SourceRuntimeAdapter } from "@scriptorium/runtime";
import { createLocalContractWatcher } from "./contract-watcher";
import { createLocalStageRepository } from "./local-stage-repository";

export function createLocalSourceRuntimeAdapter(options: {
  getLocalProjectRoot: () => string;
}): SourceRuntimeAdapter {
  return {
    type: "local",
    shouldHydratePreparedContent() {
      return false;
    },
    async prepareRepository() {
      const projectRoot = options.getLocalProjectRoot();
      return {
        projectRoot,
        repository: createLocalStageRepository(projectRoot)
      };
    },
    async loadProjectConfigForWarmup() {
      try {
        return await loadProjectConfig(options.getLocalProjectRoot());
      } catch {
        return null;
      }
    },
    startBackgroundServices(callbacks) {
      return createLocalContractWatcher({
        projectRoot: options.getLocalProjectRoot(),
        onChange() {
          void callbacks.requestPrepare();
        }
      });
    }
  };
}
