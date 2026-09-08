import { access, cp, mkdir, realpath, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import semver from "semver";
import { toRefSlug, type ScriptoriumProjectConfig } from "@scriptorium/server-api";
import type { WorkerProject } from "@scriptorium/server-worker-api";
import {
  getContractPrefixes,
  resolveProjectPaths,
  type SourceRef,
  type StageRepository
} from "@scriptorium/source-api";
import { resolveIncludeDirectives } from "../directives/include";

export interface StagedBundle {
  generatedAt: string;
  currentAssetsDir: string;
  project: ScriptoriumProjectConfig;
  workerProject: WorkerProject;
  versions: Array<{
    name: string;
    slug: string;
    kind: "branch" | "tag";
    contentDir: string;
  }>;
}

const bundleLocks = new Map<string, Promise<StagedBundle>>();

export async function buildProjectBundle(options: {
  projectRoot: string;
  outputDir: string;
  repository: StageRepository;
  loadProject: (projectRoot: string) => Promise<{
    project: ScriptoriumProjectConfig;
    workerProject: WorkerProject;
  }>;
}) {
  const projectRoot = await realpath(path.resolve(options.projectRoot));
  const outputDir = path.resolve(options.outputDir);
  const lockKey = outputDir;
  const existing = bundleLocks.get(lockKey);
  if (existing) {
    return existing;
  }

  const run = (async () => {
    const repository = options.repository;
    const currentBranch = (await repository.getCurrentBranch?.()) ?? "";
    const worktreeDirty = (await repository.isWorktreeDirty?.()) ?? false;

    await assertProjectStructure(projectRoot);

    const { project, workerProject } = await options.loadProject(projectRoot);
    const availableRefs = await repository.listRefs();

    await rm(outputDir, { recursive: true, force: true });
    await mkdir(path.join(outputDir, "versions"), { recursive: true });
    const currentAssetsDir = await copyCurrentAssets(projectRoot, outputDir);

    const versions: StagedBundle["versions"] = [];
    if (availableRefs.length === 0) {
      for (const refName of resolvePreviewRefNames(workerProject)) {
        versions.push(await exportWorkingTreeVersion(projectRoot, refName, outputDir));
      }
    } else {
      const refs = filterPublishedRefs(availableRefs, workerProject);
      for (const ref of refs) {
        if (worktreeDirty && ref.kind === "branch" && ref.name === currentBranch) {
          versions.push(await exportWorkingTreeVersion(projectRoot, ref.name, outputDir));
          continue;
        }

        const version = await exportVersion(projectRoot, repository, ref, outputDir, {
          required: ref.name === workerProject.homeRefName
        });
        if (version) {
          versions.push(version);
        }
      }
    }

    return {
      generatedAt: new Date().toISOString(),
      currentAssetsDir,
      project,
      workerProject,
      versions
    } satisfies StagedBundle;
  })();

  bundleLocks.set(lockKey, run);
  try {
    return await run;
  } finally {
    bundleLocks.delete(lockKey);
  }
}

async function assertProjectStructure(projectRoot: string) {
  const { configPath, docsContentDir } = resolveProjectPaths(projectRoot);
  await access(configPath);
  await access(docsContentDir);
}

async function copyCurrentAssets(projectRoot: string, outputDir: string) {
  const { docsAssetsDir } = resolveProjectPaths(projectRoot);
  const currentAssetsDir = path.join(outputDir, "current", "assets");

  try {
    await cp(docsAssetsDir, currentAssetsDir, { recursive: true });
  } catch {
    await mkdir(currentAssetsDir, { recursive: true });
  }

  return currentAssetsDir;
}

async function exportWorkingTreeVersion(projectRoot: string, versionName: string, outputDir: string) {
  const versionRoot = path.join(outputDir, "versions", versionName);
  const { docsAssetsDir, docsContentDir } = resolveProjectPaths(projectRoot);

  await mkdir(versionRoot, { recursive: true });
  const bundledContentDir = path.join(versionRoot, "content");
  await cp(docsContentDir, bundledContentDir, { recursive: true });

  try {
    await cp(docsAssetsDir, path.join(versionRoot, "assets"), { recursive: true });
  } catch {
    await mkdir(path.join(versionRoot, "assets"), { recursive: true });
  }

  await resolveIncludeDirectives(bundledContentDir);

  return {
    name: versionName,
    slug: toRefSlug(versionName),
    kind: "branch",
    contentDir: path.join(versionRoot, "content")
  } satisfies StagedBundle["versions"][number];
}

async function exportVersion(
  projectRoot: string,
  repository: StageRepository,
  ref: SourceRef,
  outputDir: string,
  options: { required: boolean }
) {
  const versionRoot = path.join(outputDir, "versions", ref.name);
  const bundledContentDir = path.join(versionRoot, "content");
  const files = await repository.listFiles(ref.fullName, projectRoot);
  const prefixes = getContractPrefixes(projectRoot, repository.repoRoot);
  const missingContractParts = resolveMissingContractParts(files, prefixes);

  if (missingContractParts.length > 0) {
    if (options.required) {
      throw new Error(`Ref "${ref.name}" is missing required docs contract paths: ${missingContractParts.join(", ")}.`);
    }

    return null;
  }

  await mkdir(versionRoot, { recursive: true });

  const contents = await repository.readFiles?.(ref.fullName, files);
  for (const filePath of files) {
    let destination = path.join(versionRoot, "scriptorium.project.json");
    if (filePath.startsWith(prefixes.contentPrefix)) {
      destination = path.join(bundledContentDir, filePath.slice(prefixes.contentPrefix.length));
    } else if (filePath.startsWith(prefixes.assetsPrefix)) {
      destination = path.join(versionRoot, "assets", filePath.slice(prefixes.assetsPrefix.length));
    }

    await mkdir(path.dirname(destination), { recursive: true });
    const content = contents?.get(filePath) ?? await repository.readFile(ref.fullName, filePath);
    await writeFile(destination, content);
  }

  await resolveIncludeDirectives(bundledContentDir);

  return {
    name: ref.name,
    slug: toRefSlug(ref.name),
    kind: ref.kind,
    contentDir: bundledContentDir
  } satisfies StagedBundle["versions"][number];
}

function resolveMissingContractParts(
  files: string[],
  prefixes: ReturnType<typeof getContractPrefixes>
) {
  const hasContent = files.some((entry) => entry.startsWith(prefixes.contentPrefix));
  const hasConfig = files.includes(prefixes.configPath);
  const missing: string[] = [];

  if (!hasContent) {
    missing.push("docs/content/**");
  }

  if (!hasConfig) {
    missing.push("scriptorium.project.json");
  }

  return missing;
}

function resolvePreviewRefNames(project: WorkerProject) {
  return new Set<string>([
    project.homeRefName,
    ...project.include.flatMap((rule) => ("name" in rule ? [rule.name] : [])),
    ...project.extraRefNames
  ]);
}

function filterPublishedRefs(refs: SourceRef[], project: WorkerProject) {
  const selected = new Map<string, SourceRef>();
  const homeRef = refs.find((ref) => ref.name === project.homeRefName);
  if (!homeRef) {
    throw new Error(`Unable to resolve home version "${project.homeRefName}".`);
  }

  selected.set(homeRef.name, homeRef);

  for (const rule of project.include) {
    if ("name" in rule) {
      const ref = refs.find((candidate) => candidate.kind === rule.type && candidate.name === rule.name);
      if (ref) {
        selected.set(ref.name, ref);
      }
      continue;
    }

    for (const ref of refs) {
      if (ref.kind !== rule.type)
        continue;
      if (!matchesPattern(ref.name, rule.pattern))
        continue;
      selected.set(ref.name, ref);
    }
  }

  return Array.from(selected.values()).sort((left, right) => {
    if (left.name === project.homeRefName) return -1;
    if (right.name === project.homeRefName) return 1;
    if (left.kind !== right.kind) return left.kind === "branch" ? -1 : 1;
    if (left.kind === "tag" && right.kind === "tag") {
      return compareTagNames(left.name, right.name);
    }

    return left.name.localeCompare(right.name);
  });
}

function compareTagNames(left: string, right: string) {
  const leftNormalized = semver.valid(left) ?? semver.valid(left.replace(/^v/, ""));
  const rightNormalized = semver.valid(right) ?? semver.valid(right.replace(/^v/, ""));

  if (leftNormalized && rightNormalized) {
    return semver.compare(leftNormalized, rightNormalized);
  }

  return left.localeCompare(right);
}

function matchesPattern(value: string, pattern: string) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`^${escaped.replaceAll("*", ".*")}$`);
  return regex.test(value);
}
