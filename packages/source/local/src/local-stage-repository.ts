import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
  filterBundledContractPaths,
  getContractPrefixes,
  type StageRepository
} from "@scriptorium/source-api";

export function createLocalStageRepository(projectRoot: string): StageRepository {
  return {
    repoRoot: projectRoot,
    async listRefs() {
      return [];
    },
    async listFiles(_, localProjectRoot) {
      return listWorkingTreeFiles(localProjectRoot, projectRoot);
    },
    async readFile(_, filePath) {
      return readFile(path.join(projectRoot, filePath));
    }
  };
}

async function listWorkingTreeFiles(projectRoot: string, repoRoot: string) {
  const prefixes = getContractPrefixes(projectRoot, repoRoot);
  const files = [
    ...await collectDirectoryFiles(path.join(projectRoot, "docs", "content"), prefixes.contentPrefix),
    ...await collectDirectoryFiles(path.join(projectRoot, "docs", "assets"), prefixes.assetsPrefix),
    ...await collectSingleFile(path.join(projectRoot, "scriptorium.project.json"), prefixes.configPath)
  ];

  return filterBundledContractPaths(files, projectRoot, repoRoot);
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
