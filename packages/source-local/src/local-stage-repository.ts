import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { filterBundledRepositoryPaths, getContractPrefixes, loadProjectConfig, type SourceRef, type StageRepository } from "@scriptorium/core";
import { createGitCliStageRepository } from "@scriptorium/source-git";

const WORKING_TREE_PREFIX = "working-tree/";

export function createLocalStageRepository(projectRoot: string): StageRepository {
  const gitRepository = createGitRepository(projectRoot);
  const repoRoot = gitRepository?.repoRoot ?? projectRoot;

  return {
    repoRoot,
    async listRefs() {
      const config = await loadProjectConfig(projectRoot);
      const refs = gitRepository ? await gitRepository.listRefs() : [];
      const publishedRefs = refs.map((ref) => {
        if (ref.name !== config.versions.home) {
          return ref;
        }

        return toWorkingTreeRef(ref);
      });

      if (!publishedRefs.some((ref) => ref.name === config.versions.home)) {
        publishedRefs.unshift({
          name: config.versions.home,
          fullName: `${WORKING_TREE_PREFIX}${config.versions.home}`,
          objectName: "working-tree",
          kind: "branch"
        });
      }

      return publishedRefs;
    },
    async listFiles(refName, localProjectRoot) {
      if (isWorkingTreeRef(refName)) {
        return listWorkingTreeFiles(localProjectRoot, repoRoot);
      }

      if (!gitRepository) {
        return [];
      }

      return gitRepository.listFiles(refName, localProjectRoot);
    },
    async readFile(refName, filePath) {
      if (isWorkingTreeRef(refName)) {
        return readFile(path.join(repoRoot, filePath));
      }

      if (!gitRepository) {
        throw new Error(`Unable to read git ref "${refName}" outside of a git repository.`);
      }

      return gitRepository.readFile(refName, filePath);
    },
    async getCurrentBranch() {
      return gitRepository?.getCurrentBranch?.() ?? "";
    },
    async isWorktreeDirty() {
      return gitRepository?.isWorktreeDirty?.() ?? false;
    }
  };
}

function toWorkingTreeRef(ref: SourceRef): SourceRef {
  return {
    ...ref,
    fullName: `${WORKING_TREE_PREFIX}${ref.name}`,
    objectName: "working-tree"
  };
}

function isWorkingTreeRef(refName: string) {
  return refName.startsWith(WORKING_TREE_PREFIX);
}

function createGitRepository(projectRoot: string) {
  try {
    return createGitCliStageRepository(projectRoot);
  } catch {
    return null;
  }
}

async function listWorkingTreeFiles(projectRoot: string, repoRoot: string) {
  const prefixes = getContractPrefixes(projectRoot, repoRoot);
  const files = [
    ...await collectDirectoryFiles(path.join(projectRoot, "docs", "content"), prefixes.contentPrefix),
    ...await collectDirectoryFiles(path.join(projectRoot, "docs", "assets"), prefixes.assetsPrefix),
    ...await collectSingleFile(path.join(projectRoot, "scriptorium.project.json"), prefixes.configPath)
  ];

  return filterBundledRepositoryPaths(files, projectRoot, repoRoot);
}

async function collectDirectoryFiles(dirPath: string, repoRelativePrefix: string): Promise<string[]> {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    const files: string[] = [];

    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);
      const repoRelativePath = path.posix.join(repoRelativePrefix, entry.name);

      if (entry.isDirectory()) {
        files.push(...await collectDirectoryFiles(entryPath, repoRelativePath));
      } else if (entry.isFile()) {
        files.push(normalizeJoinedPath(repoRelativePath));
      }
    }

    return files;
  } catch {
    return [];
  }
}

async function collectSingleFile(filePath: string, repoRelativePath: string) {
  try {
    await readFile(filePath);
    return [normalizeJoinedPath(repoRelativePath)];
  } catch {
    return [];
  }
}

function normalizeJoinedPath(filePath: string) {
  return filePath.replaceAll("\\", "/").replace(/\/\.\//g, "/");
}
