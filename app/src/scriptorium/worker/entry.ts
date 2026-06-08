import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildProjectBundle, readBundleManifest } from "@scriptorium/bundle";
import {
  createRuntimePreparationController,
  getRuntimeConfig,
  getRuntimePaths
} from "@scriptorium/runtime";
import { getRuntimeInstanceId } from "../instance-id";
import { exportPreparedSearchIndex, loadPreparedSource } from "../prepared-content";
import { createSourceAdapter } from "../source-adapter";
import type { WorkerCommand } from "./protocol";

const sourceAdapter = createSourceAdapter();
const preparationController = createRuntimePreparationController<void>({
  instanceId: getRuntimeInstanceId(),
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
    const source = await loadPreparedSource(bundle);

    setPhase("preparing-search");
    const searchPayload = await exportPreparedSearchIndex(source);
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
