import type { SourceAdapter } from "@scriptorium/source-api";
import { createGitCliStageRepository, syncGitCliRepository } from "./git-cli-repository";

export { createGitCliStageRepository, syncGitCliRepository } from "./git-cli-repository";
export { getRepositoryRoot, listGitRefs } from "./git-source";

export function createGitSourceAdapter(options: {
  projectRoot: string;
  repoUrl: string;
  defaultBranch: string;
  authToken?: string;
  authUsername?: string;
}): SourceAdapter {
  return {
    type: "git",
    async prepareRepository() {
      await syncGitCliRepository({
        repoDir: options.projectRoot,
        repoUrl: options.repoUrl,
        defaultBranch: options.defaultBranch,
        authToken: options.authToken,
        authUsername: options.authUsername
      });

      return {
        projectRoot: options.projectRoot,
        repository: createGitCliStageRepository(options.projectRoot)
      };
    }
  };
}
