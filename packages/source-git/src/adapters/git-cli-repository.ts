import { execFile } from "node:child_process";
import { mkdir, realpath, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { filterBundledRepositoryPaths, normalizeRepoRelativePath, type StageRepository } from "@scriptorium/core";
import { getRepositoryRoot, listGitRefs } from "../git-source";
import type { SyncGitRepositoryOptions } from "../models/sync-git-repository-options";

const execFileAsync = promisify(execFile);
const GIT_MAX_BUFFER = 16 * 1024 * 1024;

async function runGit(repoRoot: string, args: string[]) {
  const { stdout } = await execFileAsync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: GIT_MAX_BUFFER
  });

  return stdout.trim();
}

async function runGitIn(cwd: string, args: string[], options: { env?: NodeJS.ProcessEnv } = {}) {
  const { stdout } = await execFileAsync("git", args, {
    cwd,
    encoding: "utf8",
    env: options.env,
    maxBuffer: GIT_MAX_BUFFER
  });

  return stdout.trim();
}

async function readGitFile(repoRoot: string, refName: string, filePath: string) {
  const { stdout } = await execFileAsync("git", ["show", `${refName}:${filePath}`], {
    cwd: repoRoot,
    encoding: "buffer",
    maxBuffer: GIT_MAX_BUFFER
  });

  return stdout;
}

export async function createGitCliStageRepository(projectRoot: string): Promise<StageRepository> {
  const repoRoot = await getRepositoryRoot(projectRoot);

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

      const output = (await runGit(repoRoot, args)).trim();
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
        return await runGit(repoRoot, ["branch", "--show-current"]);
      } catch {
        return "";
      }
    },
    async isWorktreeDirty() {
      try {
        return (await runGit(repoRoot, ["status", "--porcelain"])) !== "";
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

    await runGitIn(repoDir, ["remote", "set-url", "origin", repoUrl], { env: environment });
  } catch {
    await rm(repoDir, { recursive: true, force: true });
    await mkdir(repoDir, { recursive: true });
    await runGitIn(repoDir, ["init", "--initial-branch", defaultBranch], { env: environment });
    await runGitIn(repoDir, ["remote", "add", "origin", repoUrl], { env: environment });
  }

  await runGitIn(repoDir, ["fetch", "--prune", "--prune-tags", "--tags", "origin"], { env: environment });
  await runGitIn(repoDir, ["checkout", "-B", defaultBranch, `origin/${defaultBranch}`], { env: environment });
  await runGitIn(repoDir, ["reset", "--hard", `origin/${defaultBranch}`], { env: environment });
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
