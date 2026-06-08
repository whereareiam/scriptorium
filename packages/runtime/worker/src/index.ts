import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildProjectBundle, readBundleManifest, type BundleManifest } from "@scriptorium/bundle";
import { type DocsSource } from "@scriptorium/content";
import {
  createRuntimePreparationController,
  getRuntimeConfig,
  getRuntimePaths,
  type SourceRuntimeAdapter
} from "@scriptorium/runtime";
import type { WorkerCommand } from "./worker-protocol";

export {
  createWorkerSupervisor,
  type WorkerProcess
} from "./worker-supervisor";
export { createSourceAdapter } from "./source-adapter";
export {
  exportPreparedSearchIndex,
  hydratePreparedContent,
  loadPreparedSource,
  readPreparedSearchIndex,
  resolveGenerationPaths,
  type PreparedRuntimeContent
} from "./prepared-content";
export { getRuntimeInstanceId } from "./instance-id";
export type {
  OnlineMessage,
  PrepareCommand,
  PrepareFinishedMessage,
  ShutdownCommand,
  WorkerCommand,
  WorkerMessage
} from "./worker-protocol";

export function runRuntimeWorker(options: {
  createSourceAdapter: () => SourceRuntimeAdapter;
  getRuntimeInstanceId: () => string;
  loadPreparedSource: (bundle: BundleManifest) => Promise<DocsSource>;
  exportPreparedSearchIndex: (source: DocsSource) => Promise<string>;
}) {
  const sourceAdapter = options.createSourceAdapter();
  const preparationController = createRuntimePreparationController<void>({
    instanceId: options.getRuntimeInstanceId(),
    getRuntimeConfig,
    async prepare({ generationDir, setPhase }) {
      await mkdir(generationDir, { recursive: true });
      const bundleDir = path.join(generationDir, "bundle");
      const searchIndexPath = path.join(generationDir, "search-index.json");

      const { projectRoot, repository } = await sourceAdapter.prepareRepository();
      await buildProjectBundle({
        projectRoot,
        outputDir: bundleDir,
        repository
      });

      const bundle = await readBundleManifest(projectRoot, bundleDir);

      setPhase("preparing-content");
      const source = await options.loadPreparedSource(bundle);

      setPhase("preparing-search");
      const searchPayload = await options.exportPreparedSearchIndex(source);
      await writeFile(searchIndexPath, searchPayload);
    },
    activate: async () => undefined
  });

  let currentPrepare: Promise<void> | null = null;
  let shutdownRequested = false;

  process.on("message", (message: WorkerCommand) => {
    if (message.type === "shutdown") {
      shutdownRequested = true;
      if (!currentPrepare) {
        process.exit(0);
      }
      return;
    }

    if (message.type === "prepare") {
      if (!currentPrepare) {
        currentPrepare = preparationController.requestPrepare()
          .finally(() => {
            process.send?.({
              type: "prepare-finished"
            });
            currentPrepare = null;

            if (shutdownRequested) {
              process.exit(0);
            }
          });
        return;
      }

      void preparationController.requestPrepare();
    }
  });

  process.send?.({
    type: "online"
  });
}
