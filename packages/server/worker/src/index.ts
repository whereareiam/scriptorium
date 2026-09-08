import type { ScriptoriumProjectConfig } from "@scriptorium/server-api";
import type { WorkerProject, WorkerService } from "@scriptorium/server-worker-api";
import type { SourceAdapter } from "@scriptorium/source-api";
import { getContentFingerprint } from "./bundle/content-fingerprint";
import { buildProjectBundle } from "./bundle/build-project-bundle";
import { buildServedArtifacts, type BuiltServedArtifacts } from "./bundle/served/build/build-served-artifacts";
import { writeServedBundleManifest } from "./bundle/content";
import { BundlingLogger, createPreparationController, type RuntimePaths } from "./preparation";

export { type RuntimePaths } from "./preparation";

export function createWorkerService(options: {
  sourceAdapter: SourceAdapter;
  runtimePaths: RuntimePaths;
  loadProject: (projectRoot: string) => Promise<{
    project: ScriptoriumProjectConfig;
    workerProject: WorkerProject;
  }>;
}): WorkerService {
  const logger = new BundlingLogger(options.sourceAdapter.type);
  let lastBuiltFingerprint: string | undefined;
  let lastBuiltGenerationId: string | undefined;
  const preparationController = createPreparationController<BuiltServedArtifacts>({
    runtimePaths: options.runtimePaths,
    logger,
    getCompletionPayload(value) {
      return {
        artifact_bytes: value.artifact_bytes,
        page_count: value.page_count,
        ref_count: value.ref_count,
        search_document_count: value.search_document_count
      };
    },
    async prepare({ generationId, generationDir, activeGenerationId, request, setPhase }) {
      const bundleDir = `${generationDir}/bundle`;
      const { projectRoot, repository } = await options.sourceAdapter.prepareRepository();
      const stagedBundle = await buildProjectBundle({
        projectRoot,
        outputDir: bundleDir,
        repository,
        loadProject: options.loadProject
      });

      const fingerprint = await getContentFingerprint(bundleDir, stagedBundle.project);
      if (activeGenerationId === lastBuiltGenerationId && fingerprint === lastBuiltFingerprint)
        return null;

      const servedArtifacts = await buildServedArtifacts(stagedBundle, generationDir, {
        logger,
        request,
        setPhase
      });
      await writeServedBundleManifest(bundleDir, servedArtifacts.manifest);
      lastBuiltFingerprint = fingerprint;
      lastBuiltGenerationId = generationId;
      return servedArtifacts;
    },
    activate: async () => undefined,
    onIdle() {
      // Run after the preparation promise unwinds, releasing temporary compiler allocations.
      if (typeof Bun !== "undefined")
        setTimeout(() => Bun.gc(true), 0).unref();
    }
  });

  let started = false;
  let backgroundServiceHandle: { close(): void } | null = null;

  return {
    start() {
      if (started) {
        return;
      }

      started = true;
      void preparationController.requestPrepare({
        reason: "manual"
      });

      if (options.sourceAdapter.startBackgroundServices) {
        backgroundServiceHandle = options.sourceAdapter.startBackgroundServices({
          requestPrepare: (request) => preparationController.requestPrepare(request)
        });
      }
    },
    requestPrepare(request) {
      return preparationController.requestPrepare(request);
    },
    close() {
      backgroundServiceHandle?.close();
      backgroundServiceHandle = null;
    }
  };
}
