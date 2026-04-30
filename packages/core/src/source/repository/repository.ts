import { isBundledContractPath, normalizeRepoRelativePath } from "../../project/project-paths";

export function filterBundledRepositoryPaths(files: string[], projectRoot: string, repoRoot: string) {
  return files
    .map((entry) => normalizeRepoRelativePath(entry))
    .filter((entry) => isBundledContractPath(entry, projectRoot, repoRoot));
}
