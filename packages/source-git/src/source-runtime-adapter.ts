import { loadProjectConfig } from "@scriptorium/core";
import { type SourceRuntimeAdapter } from "@scriptorium/runtime";
import { createGitCliStageRepository, syncGitCliRepository } from "./adapters/git-cli-repository";
import { createGitHubWebhookHandler } from "./github-webhook";

export function createGitSourceRuntimeAdapter(options: {
  getRuntimeConfig: () => {
    source: {
      target?: string;
      defaultBranch: string;
      auth?: {
        token?: string;
        username?: string;
      };
    };
    runtime: {
      dataDir: string;
    };
    triggers?: {
      webhook?: {
        secret?: string;
      };
    };
  };
  getRuntimePaths: () => {
    repoDir: string;
  };
}): SourceRuntimeAdapter {
  return {
    type: "git",
    shouldHydratePreparedContent() {
      return true;
    },
    async prepareRepository() {
      const config = options.getRuntimeConfig();
      if (!config.source.target) {
        throw new Error("Runtime source.target is not configured for git source mode.");
      }

      const projectRoot = options.getRuntimePaths().repoDir;
      await syncGitCliRepository({
        repoDir: projectRoot,
        repoUrl: config.source.target,
        defaultBranch: config.source.defaultBranch,
        authToken: config.source.auth?.token,
        authUsername: config.source.auth?.username
      });

      return {
        projectRoot,
        repository: await createGitCliStageRepository(projectRoot)
      };
    },
    async loadProjectConfigForWarmup() {
      try {
        return await loadProjectConfig(options.getRuntimePaths().repoDir);
      } catch {
        return null;
      }
    },
    async handleWebhook(request, callbacks) {
      const handler = createGitHubWebhookHandler({
        isEnabled: () => true,
        getSecret: () => options.getRuntimeConfig().triggers?.webhook?.secret,
        refresh: callbacks.requestPrepare
      });

      return handler(request);
    }
  };
}
