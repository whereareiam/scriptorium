import { watch, type FSWatcher } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { isBundledContractPath, normalizeRepoRelativePath } from "@scriptorium/core";

export function createLocalContractWatcher(options: {
  projectRoot: string;
  onChange: () => void;
  debounceMs?: number;
}) {
  const debounceMs = options.debounceMs ?? 150;
  const watchers = new Map<string, FSWatcher>();
  let closed = false;
  let debounceHandle: ReturnType<typeof setTimeout> | undefined;
  let refreshScheduled = false;

  void refreshWatchers();

  return {
    close() {
      closed = true;
      if (debounceHandle) clearTimeout(debounceHandle);
      for (const watcher of watchers.values()) {
        watcher.close();
      }
      watchers.clear();
    }
  };

  function scheduleChange() {
    if (closed)
      return;

    if (debounceHandle) clearTimeout(debounceHandle);
    debounceHandle = setTimeout(() => {
      debounceHandle = undefined;
      options.onChange();
    }, debounceMs);
  }

  function scheduleRefresh() {
    if (refreshScheduled || closed)
      return;

    refreshScheduled = true;
    queueMicrotask(async () => {
      refreshScheduled = false;
      await refreshWatchers();
    });
  }

  async function refreshWatchers() {
    const nextDirectories = new Set<string>(await collectWatchDirectories(options.projectRoot));

    for (const watchedDir of watchers.keys()) {
      if (nextDirectories.has(watchedDir))
        continue;

      watchers.get(watchedDir)?.close();
      watchers.delete(watchedDir);
    }

    for (const dir of nextDirectories) {
      if (watchers.has(dir))
        continue;

      try {
        const watcher = watch(dir, { persistent: false }, (_, fileName) => {
          if (fileName && !matchesContractPath(options.projectRoot, path.join(dir, fileName.toString()))) {
            scheduleRefresh();
            return;
          }

          scheduleRefresh();
          scheduleChange();
        });
        watchers.set(dir, watcher);
      } catch {
        // Ignore directories that disappear between scanning and watch registration.
      }
    }
  }
}

async function collectWatchDirectories(projectRoot: string) {
  const directories = new Set<string>([
    projectRoot,
    path.join(projectRoot, "docs"),
    path.join(projectRoot, "docs", "content"),
    path.join(projectRoot, "docs", "assets")
  ]);

  await collectNestedDirectories(path.join(projectRoot, "docs", "content"), directories);
  await collectNestedDirectories(path.join(projectRoot, "docs", "assets"), directories);
  return Array.from(directories);
}

async function collectNestedDirectories(rootDir: string, directories: Set<string>) {
  try {
    const entries = await readdir(rootDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory())
        continue;

      const dirPath = path.join(rootDir, entry.name);
      directories.add(dirPath);
      await collectNestedDirectories(dirPath, directories);
    }
  } catch {
    // Ignore missing directories.
  }
}

function matchesContractPath(projectRoot: string, absolutePath: string) {
  const relativePath = normalizeRepoRelativePath(path.relative(projectRoot, absolutePath));
  return isBundledContractPath(relativePath, projectRoot, projectRoot);
}
