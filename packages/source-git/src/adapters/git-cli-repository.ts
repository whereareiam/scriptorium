import { execFileSync } from "node:child_process";
import { mkdir, realpath, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { filterBundledRepositoryPaths, normalizeRepoRelativePath, type StageRepository } from "@scriptorium/core";
import { getRepositoryRoot, listGitRefs } from "../git-source";
import type { SyncGitRepositoryOptions } from "../models/sync-git-repository-options";

function runGit(repoRoot: string, args: string[]) {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8"
  }).trim();
}

function runGitIn(cwd: string, args: string[], options: { env?: NodeJS.ProcessEnv } = {}) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    env: options.env
  }).trim();
}

function readGitFile(repoRoot: string, refName: string, filePath: string) {
  return execFileSync("git", ["show", `${refName}:${filePath}`], {
    cwd: repoRoot,
    encoding: "buffer"
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
      const { projectPath, realProjectRoot, realRepoRoot } = await resolveRepositoryPaths(repoRoot, localProjectRoot);
      const args = ["ls-tree", "-r", "--name-only", refName];
      if (projectPath !== "") {
        args.push(projectPath);
      }

      const output = runGit(repoRoot, args).trim();
      if (output === "") {
        return [];
      }

      return filterBundledRepositoryPaths(output.split("\n"), realProjectRoot, realRepoRoot);
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

async function resolveRepositoryPaths(repoRoot: string, projectRoot: string) {
  const [realRepoRoot, realProjectRoot] = await Promise.all([
    realpath(repoRoot),
    realpath(projectRoot)
  ]);

  return {
    projectPath: normalizeRepoRelativePath(path.relative(realRepoRoot, realProjectRoot)),
    realProjectRoot,
    realRepoRoot
  };
}

export async function syncGitCliRepository(options: SyncGitRepositoryOptions) {
  const { repoDir, repoUrl, defaultBranch } = options;
  const environment = await createGitEnvironment(repoDir, options);

  try {
    const repoStats = await stat(path.join(repoDir, ".git"));
    if (!repoStats.isDirectory()) {
      throw new Error("Not a git repository.");
    }

    runGitIn(repoDir, ["remote", "set-url", "origin", repoUrl], { env: environment });
  } catch {
    await rm(repoDir, { recursive: true, force: true });
    await mkdir(repoDir, { recursive: true });
    runGitIn(repoDir, ["init", "--initial-branch", defaultBranch], { env: environment });
    runGitIn(repoDir, ["remote", "add", "origin", repoUrl], { env: environment });
  }

  runGitIn(repoDir, ["fetch", "--prune", "--prune-tags", "--tags", "origin"], { env: environment });
  runGitIn(repoDir, ["checkout", "-B", defaultBranch, `origin/${defaultBranch}`], { env: environment });
  runGitIn(repoDir, ["reset", "--hard", `origin/${defaultBranch}`], { env: environment });
}

async function createGitEnvironment(repoDir: string, options: SyncGitRepositoryOptions) {
  if (!options.authToken) return process.env;

  const askPassPath = path.join(path.dirname(repoDir), ".scriptorium-git-askpass.sh");
  await mkdir(path.dirname(askPassPath), { recursive: true });
  await writeFile(
    askPassPath,
    [
      "#!/bin/sh",
      "case \"$1\" in",
      "  *Username*) printf '%s\\n' \"$SCRIPTORIUM_GIT_AUTH_USERNAME\" ;;",
      "  *Password*) printf '%s\\n' \"$SCRIPTORIUM_GIT_AUTH_TOKEN\" ;;",
      "  *) printf '\\n' ;;",
      "esac",
      ""
    ].join("\n"),
    { mode: 0o700 }
  );

  return {
    ...process.env,
    GIT_ASKPASS: askPassPath,
    GIT_TERMINAL_PROMPT: "0",
    SCRIPTORIUM_GIT_AUTH_TOKEN: options.authToken,
    SCRIPTORIUM_GIT_AUTH_USERNAME: options.authUsername ?? "x-access-token"
  };
}
