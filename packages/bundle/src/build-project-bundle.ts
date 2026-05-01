import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  assertProjectStructure,
  filterPublishedRefs,
  loadProjectConfig
} from "@scriptorium/core";
import { copyCurrentAssets } from "./export/current-assets";
import { exportVersion } from "./export/export-version";
import { exportWorkingTreeVersion } from "./export/export-working-tree-version";
import type { BuildProjectBundleOptions } from "./models/build-project-bundle-options";
import type { BundleManifest } from "./models/bundle-manifest";
import type { BundledVersion } from "./models/bundled-version";

const bundleLocks = new Map<string, Promise<BundleManifest>>();

async function buildWorkingTreeVersions(projectRoot: string, outputDir: string, project: Awaited<ReturnType<typeof loadProjectConfig>>) {
  const refNames = new Set<string>([
    project.versions.home,
    ...project.versions.include.flatMap((rule) => ("name" in rule ? [rule.name] : [])),
    ...Object.keys(project.versions.meta)
  ]);

  const bundledVersions: BundledVersion[] = [];

  for (const refName of refNames) {
    bundledVersions.push(await exportWorkingTreeVersion(projectRoot, refName, outputDir));
  }

  return bundledVersions;
}

export async function buildProjectBundle(options: BuildProjectBundleOptions) {
  const projectRoot = path.resolve(options.projectRoot ?? process.cwd());
  const outputDir = path.resolve(options.outputDir ?? path.join(projectRoot, ".scriptorium", "bundle"));
  const lockKey = outputDir;
  const existing = bundleLocks.get(lockKey);
  if (existing) {
    return existing;
  }

  const run = (async () => {
    const repository = options.repository;
    const repoRoot = repository.repoRoot;
    const currentBranch = (await repository.getCurrentBranch?.()) ?? "";
    const worktreeDirty = (await repository.isWorktreeDirty?.()) ?? false;

    await assertProjectStructure(projectRoot);

    const project = await loadProjectConfig(projectRoot);
    const availableRefs = await repository.listRefs();

    await rm(outputDir, { recursive: true, force: true });
    await mkdir(path.join(outputDir, "versions"), { recursive: true });
    await copyCurrentAssets(projectRoot, outputDir);

    let bundledVersions: BundledVersion[] = [];
    if (availableRefs.length === 0) {
      bundledVersions = await buildWorkingTreeVersions(projectRoot, outputDir, project);
    } else {
      const refs = filterPublishedRefs(availableRefs, project);
      for (const ref of refs) {
        if (worktreeDirty && ref.kind === "branch" && ref.name === currentBranch) {
          bundledVersions.push(await exportWorkingTreeVersion(projectRoot, ref.name, outputDir));
          continue;
        }

        bundledVersions.push(await exportVersion(projectRoot, repository, ref, outputDir));
      }
    }

    const manifest = {
      generatedAt: new Date().toISOString(),
      projectRoot,
      repoRoot,
      project,
      versions: bundledVersions
    } satisfies BundleManifest;

    await mkdir(outputDir, { recursive: true });
    await writeFile(path.join(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2));

    return manifest;
  })();

  bundleLocks.set(lockKey, run);
  try {
    return await run;
  } finally {
    bundleLocks.delete(lockKey);
  }
}
