import { loadProjectConfig } from "@/config/load-project-config";
import {
  loadRuntimeConfig,
  resolveLocalProjectRoot,
  resolveRuntimePaths,
  type RuntimeConfig,
  type RuntimePaths
} from "@/config/load-runtime-config";
import {
  toRefSlug,
} from "@scriptorium/server-api";
import {
  createScriptoriumServer,
  renderPreparedPageArtifact,
  type ScriptoriumServer
} from "@scriptorium/server";
import { createWorkerService } from "@scriptorium/server-worker";
import type { WorkerService } from "@scriptorium/server-worker-api";
import type { SourceAdapter } from "@scriptorium/source-api";
import { createGitSourceAdapter } from "@scriptorium/source-git";
import { createLocalSourceAdapter } from "@scriptorium/source-local";
import { createGitHubTriggerHandler } from "@scriptorium/trigger-github";
import type { TriggerHandler } from "@scriptorium/trigger-api";
import { buildWorkspaceThemeStylesheet } from "@scriptorium/ui";

interface RuntimeServices {
  server: ScriptoriumServer;
  worker: WorkerService;
  triggerHandler: TriggerHandler;
}

const globalRuntime = globalThis as typeof globalThis & {
  __scriptoriumRuntime?: RuntimeServices;
};

function getRuntimeServices() {
  const runtime = globalRuntime.__scriptoriumRuntime ??= createRuntimeServices();
  runtime.worker.start();
  return runtime;
}

export function ensureRuntimeServices() {
  getRuntimeServices();
}

export async function getRuntimeReadiness() {
  return getRuntimeServices().server.getReadiness();
}

export async function getProjectConfig() {
  return getRuntimeServices().server.getProjectConfig();
}

export async function getBundlingCaptions() {
  return getRuntimeServices().server.getBundlingCaptions();
}

export async function getPublishedVersions() {
  return getRuntimeServices().server.getPublishedVersions();
}

export async function getPreparedPage(slugSegments: string[]) {
  return getRuntimeServices().server.getPreparedPage(slugSegments);
}

export async function getSidebarTree(refName: string) {
  return getRuntimeServices().server.getSidebarTree(refName);
}

export async function resolvePreparedPageHref(refNameOrSlug: string, sourcePath: string, href: string) {
  return getRuntimeServices().server.resolvePreparedPageHref(refNameOrSlug, sourcePath, href);
}

export async function getPreparedSearchIndex(refSlug: string) {
  return getRuntimeServices().server.getPreparedSearchIndex(refSlug);
}

export async function requestRuntimePreparation() {
  await getRuntimeServices().worker.requestPrepare({
    reason: "manual"
  });
}

export function handleHealthRequest() {
  return getRuntimeServices().server.handleHealthRequest();
}

export function handleReadinessRequest() {
  return getRuntimeServices().server.handleReadinessRequest();
}

export function handleSearchRequest(request: Request) {
  return getRuntimeServices().server.handleSearchRequest(request);
}

export async function handleSourceWebhook(request: Request) {
  const result = await getRuntimeServices().triggerHandler.handle(request);
  return Response.json(result, {
    status: result.status
  });
}

export function readCurrentAsset(assetSegments: string[]) {
  return getRuntimeServices().server.readCurrentAsset(assetSegments);
}

export {
  renderPreparedPageArtifact,
  buildWorkspaceThemeStylesheet,
  toRefSlug
};

function createRuntimeServices(): RuntimeServices {
  const config = loadRuntimeConfig();
  const runtimePaths = resolveRuntimePaths(config);
  const localProjectRoot = resolveLocalProjectRoot(config);
  const sourceAdapter = createSourceAdapter(config, runtimePaths, localProjectRoot);
  const worker = createWorker(runtimePaths, sourceAdapter);
  const server = createScriptoriumServer({
    generationsDir: runtimePaths.generationsDir,
    stateFile: runtimePaths.stateFile
  });
  const triggerHandler = createGitHubTriggerHandler({
    secret: config.triggers?.webhook?.secret,
    workerService: worker
  });

  return {
    server,
    worker,
    triggerHandler
  };
}

function createSourceAdapter(config: RuntimeConfig, runtimePaths: RuntimePaths, localProjectRoot: string): SourceAdapter {
  if (config.source.type === "git") {
    if (!config.source.target) {
      throw new Error("Runtime source.target is not configured for git source mode.");
    }

    return createGitSourceAdapter({
      projectRoot: runtimePaths.repoDir,
      repoUrl: config.source.target,
      defaultBranch: config.source.defaultBranch,
      authToken: config.source.auth?.token,
      authUsername: config.source.auth?.username
    });
  }

  return createLocalSourceAdapter({
    projectRoot: localProjectRoot
  });
}

function createWorker(runtimePaths: RuntimePaths, sourceAdapter: SourceAdapter): WorkerService {
  return createWorkerService({
    sourceAdapter,
    runtimePaths,
    async loadProject(projectRoot) {
      const project = await loadProjectConfig(projectRoot);

      return {
        project,
        workerProject: {
          homeRefName: project.versions.home,
          include: project.versions.include,
          extraRefNames: Object.keys(project.versions.meta)
        }
      };
    }
  });
}
