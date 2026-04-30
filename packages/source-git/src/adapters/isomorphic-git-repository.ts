import fs from "node:fs";
import { mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import git from "isomorphic-git";
import http from "isomorphic-git/http/node";
import { filterBundledRepositoryPaths, type SourceRef, type StageRepository } from "@scriptorium/core";
import type { SyncGitRepositoryOptions } from "../models/sync-git-repository-options";

const REMOTE_NAME = "origin";

export function createIsomorphicGitStageRepository(repoRoot: string): StageRepository {
  return {
    repoRoot,
    async listRefs() {
      return listRepositoryRefs(repoRoot);
    },
    async listFiles(refName, projectRoot) {
      const files = await git.listFiles({
        fs,
        dir: repoRoot,
        ref: refName
      });

      return filterBundledRepositoryPaths(files, projectRoot, repoRoot);
    },
    async readFile(refName, filePath) {
      const oid = await git.resolveRef({
        fs,
        dir: repoRoot,
        ref: refName
      });
      const { blob } = await git.readBlob({
        fs,
        dir: repoRoot,
        oid,
        filepath: filePath
      });

      return Buffer.from(blob);
    }
  };
}

export async function syncIsomorphicGitRepository(options: SyncGitRepositoryOptions) {
  const { repoDir, repoUrl, defaultBranch } = options;
  const onAuth = createGitAuthCallback(options.authToken, options.authUsername);

  try {
    const repoStats = await stat(path.join(repoDir, ".git"));
    if (!repoStats.isDirectory()) {
      throw new Error("Not a git repository.");
    }

    await git.setConfig({
      fs,
      dir: repoDir,
      path: `remote.${REMOTE_NAME}.url`,
      value: repoUrl
    });
    await git.fetch({
      fs,
      http,
      dir: repoDir,
      remote: REMOTE_NAME,
      singleBranch: false,
      tags: true,
      prune: true,
      pruneTags: true,
      onAuth
    });
    await hardResetTrackedBranch(repoDir, defaultBranch);
    return;
  } catch {
    await rm(repoDir, { recursive: true, force: true });
  }

  await mkdir(path.dirname(repoDir), { recursive: true });
  await git.clone({
    fs,
    http,
    dir: repoDir,
    url: repoUrl,
    ref: defaultBranch,
    singleBranch: false,
    onAuth
  });
}

async function listRepositoryRefs(repoRoot: string) {
  const refs = new Map<string, SourceRef>();

  await addBranchRefs(refs, repoRoot, false);
  await addBranchRefs(refs, repoRoot, true);
  await addTagRefs(refs, repoRoot);

  return Array.from(refs.values());
}

async function addBranchRefs(refs: Map<string, SourceRef>, repoRoot: string, remote: boolean) {
  const branchNames = await git.listBranches({
    fs,
    dir: repoRoot,
    remote: remote ? REMOTE_NAME : undefined
  });

  for (const rawName of branchNames) {
    if (rawName === "HEAD") continue;

    const name = remote ? rawName.replace(/^origin\//, "") : rawName;
    const fullName = remote ? `refs/remotes/${REMOTE_NAME}/${name}` : `refs/heads/${name}`;
    const existing = refs.get(name);
    if (existing && existing.fullName.startsWith("refs/heads/")) {
      continue;
    }

    refs.set(name, {
      name,
      fullName,
      objectName: await git.resolveRef({
        fs,
        dir: repoRoot,
        ref: fullName
      }),
      kind: "branch"
    });
  }
}

async function addTagRefs(refs: Map<string, SourceRef>, repoRoot: string) {
  const tagNames = await git.listTags({
    fs,
    dir: repoRoot
  });

  for (const name of tagNames) {
    const fullName = `refs/tags/${name}`;
    refs.set(name, {
      name,
      fullName,
      objectName: await git.resolveRef({
        fs,
        dir: repoRoot,
        ref: fullName
      }),
      kind: "tag"
    });
  }
}

async function hardResetTrackedBranch(repoDir: string, branchName: string) {
  const remoteRef = `refs/remotes/${REMOTE_NAME}/${branchName}`;
  const branchRef = `refs/heads/${branchName}`;
  const remoteOid = await git.resolveRef({
    fs,
    dir: repoDir,
    ref: remoteRef
  });

  await git.writeRef({
    fs,
    dir: repoDir,
    ref: branchRef,
    value: remoteOid,
    force: true
  });
  await git.checkout({
    fs,
    dir: repoDir,
    ref: branchName,
    force: true
  });
}

function createGitAuthCallback(authToken?: string, authUsername = "x-access-token") {
  if (!authToken) {
    return undefined;
  }

  return () => ({
    username: authUsername,
    password: authToken
  });
}
