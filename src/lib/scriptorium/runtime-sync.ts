import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { getRuntimeConfig } from "./runtime-config";
import { stageProjectRefs } from "./staging";

const execFileAsync = promisify(execFile);

interface RuntimeState {
  lastSyncedAt: string;
  manifestHash: string;
}

const syncLocks = new Map<string, Promise<void>>();

export function getRuntimePaths() {
  const config = getRuntimeConfig();
  const repoDir = path.join(config.dataDir, "repo");
  const stagedDir = path.join(config.dataDir, "staged");
  const stateFile = path.join(config.dataDir, "state.json");

  return {
    config,
    repoDir,
    stagedDir,
    stateFile
  };
}

export async function ensureRuntimeSnapshot(force = false) {
  const { config, repoDir, stagedDir, stateFile } = getRuntimePaths();
  const lockKey = repoDir;
  const existing = syncLocks.get(lockKey);
  if (existing) {
    await existing;
    return;
  }

  const run = (async () => {
    await mkdir(config.dataDir, { recursive: true });

    if (!force) {
      const state = await readRuntimeState(stateFile);
      if (state) {
        const ageMs = Date.now() - Date.parse(state.lastSyncedAt);
        if (ageMs < config.refreshIntervalSeconds * 1000) {
          return;
        }
      }
    }

    await ensureRepository(repoDir, config.repoUrl, config.defaultBranch, config.gitAuthToken);
    await stageProjectRefs({
      projectRoot: repoDir,
      outputDir: stagedDir
    });

    const manifestHash = await hashFile(path.join(stagedDir, "manifest.json"));
    await writeFile(
      stateFile,
      JSON.stringify(
        {
          lastSyncedAt: new Date().toISOString(),
          manifestHash
        } satisfies RuntimeState,
        null,
        2
      )
    );
  })();

  syncLocks.set(lockKey, run);
  try {
    await run;
  } finally {
    syncLocks.delete(lockKey);
  }
}

export async function refreshRuntimeSnapshot() {
  await ensureRuntimeSnapshot(true);
}

export function verifyWebhookSignature(payload: string, signatureHeader: string | null) {
  const secret = getRuntimeConfig().webhookSecret;
  if (!secret) {
    throw new Error("SCRIPTORIUM_WEBHOOK_SECRET is not configured.");
  }

  if (!signatureHeader?.startsWith("sha256=")) {
    return false;
  }

  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const actual = signatureHeader.slice("sha256=".length);

  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(actual, "hex"));
  } catch {
    return false;
  }
}

async function ensureRepository(repoDir: string, repoUrl: string, defaultBranch: string, gitAuthToken?: string) {
  const remoteUrl = withGitHubToken(repoUrl, gitAuthToken);

  try {
    const repoStats = await stat(path.join(repoDir, ".git"));
    if (repoStats.isDirectory()) {
      await git(["remote", "set-url", "origin", remoteUrl], repoDir);
      await git(["fetch", "--force", "origin", "+refs/heads/*:refs/remotes/origin/*", "+refs/tags/*:refs/tags/*"], repoDir);
      await git(["checkout", "-f", defaultBranch], repoDir);
      await git(["clean", "-fd"], repoDir);
      await git(["reset", "--hard", `origin/${defaultBranch}`], repoDir);
      return;
    }
  } catch {
    // fall through to clone
  }

  await rm(repoDir, { recursive: true, force: true });
  await mkdir(path.dirname(repoDir), { recursive: true });
  await execFileAsync("git", ["clone", "--branch", defaultBranch, remoteUrl, repoDir]);
  await git(["fetch", "--force", "origin", "+refs/heads/*:refs/remotes/origin/*", "+refs/tags/*:refs/tags/*"], repoDir);
}

async function git(args: string[], cwd: string) {
  await execFileAsync("git", args, { cwd });
}

async function readRuntimeState(stateFile: string) {
  try {
    const raw = await readFile(stateFile, "utf8");
    return JSON.parse(raw) as RuntimeState;
  } catch {
    return null;
  }
}

async function hashFile(filePath: string) {
  const content = await readFile(filePath);
  return createHash("sha256").update(content).digest("hex");
}

function withGitHubToken(repoUrl: string, gitAuthToken?: string) {
  if (!gitAuthToken) return repoUrl;
  if (!repoUrl.startsWith("https://")) return repoUrl;

  const url = new URL(repoUrl);
  if (url.username || url.password) return repoUrl;

  url.username = "x-access-token";
  url.password = gitAuthToken;
  return url.toString();
}
