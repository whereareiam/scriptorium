import type { ScriptoriumProjectConfig } from "@scriptorium/server-api";
import type { WorkerProject, WorkerService } from "@scriptorium/server-worker-api";
import type { SourceAdapter } from "@scriptorium/source-api";
import { buildProjectBundle } from "./bundle/build-project-bundle";
import { writeServedBundleManifest } from "./bundle/content";
import { buildSearchArtifacts } from "./bundle/search";
import { createPreparationController, type RuntimePaths } from "./preparation";

export { type RuntimePaths } from "./preparation";

export function createWorkerService(options: {
  sourceAdapter: SourceAdapter;
  runtimePaths: RuntimePaths;
  loadProject: (projectRoot: string) => Promise<{
    project: ScriptoriumProjectConfig;
    workerProject: WorkerProject;
  }>;
}): WorkerService {
  const preparationController = createPreparationController<void>({
    runtimePaths: options.runtimePaths,
    async prepare({ generationDir, setPhase }) {
      const bundleDir = `${generationDir}/bundle`;
      const { projectRoot, repository } = await options.sourceAdapter.prepareRepository();
      const stagedBundle = await buildProjectBundle({
        projectRoot,
        outputDir: bundleDir,
        repository,
        loadProject: options.loadProject
      });

      setPhase("preparing-content");
      const manifest = await buildSearchArtifacts(stagedBundle, generationDir);
      setPhase("preparing-search");
      await writeServedBundleManifest(bundleDir, manifest);
    },
    activate: async () => undefined
  });

  let started = false;
  let backgroundServiceHandle: { close(): void } | null = null;

  return {
    start() {
      if (started) {
        return;
      }

      started = true;
      void preparationController.requestPrepare();

      if (options.sourceAdapter.startBackgroundServices) {
        backgroundServiceHandle = options.sourceAdapter.startBackgroundServices({
          requestPrepare: () => preparationController.requestPrepare()
        });
      }
    },
    requestPrepare() {
      return preparationController.requestPrepare();
    },
    close() {
      backgroundServiceHandle?.close();
      backgroundServiceHandle = null;
    }
  };
}
