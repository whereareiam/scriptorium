import { execFileSync } from "node:child_process";
import { filterBundledRepositoryPaths, type StageRepository } from "@scriptorium/core";
import { getRepositoryRoot, listGitRefs } from "../git-source";

function runGit(repoRoot: string, args: string[]) {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8"
  }).trim();
}

function readGitFile(repoRoot: string, refName: string, filePath: string) {
  return execFileSync("git", ["show", `${refName}:${filePath}`], {
    cwd: repoRoot
  });
}

export function createGitCliStageRepository(projectRoot: string): StageRepository {
  const repoRoot = getRepositoryRoot(projectRoot);

  return {
    repoRoot,
    async listRefs() {
      return listGitRefs(projectRoot);
    },
    async listFiles(refName, localProjectRoot) {
      const output = runGit(repoRoot, ["ls-tree", "-r", "--name-only", refName]).trim();
      if (output === "") {
        return [];
      }

      return filterBundledRepositoryPaths(output.split("\n"), localProjectRoot, repoRoot);
    },
    async readFile(refName, filePath) {
      return readGitFile(repoRoot, refName, filePath);
    },
    async getCurrentBranch() {
      try {
        return runGit(repoRoot, ["branch", "--show-current"]);
      } catch {
        return "";
      }
    },
    async isWorktreeDirty() {
      try {
        return runGit(repoRoot, ["status", "--porcelain"]) !== "";
      } catch {
        return false;
      }
    }
  };
}
