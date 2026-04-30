import { execFileSync } from "node:child_process";
import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  assertProjectContract,
  getContractPrefixes,
  isBundledContractPath,
  loadProjectConfig,
  normalizeRepoRelativePath,
  resolveProjectPaths,
  type ScriptoriumProjectConfig
} from "./config";
import { filterPublishedRefs, getRepositoryRoot, listGitRefs, type GitRef, type GitRefKind } from "./git";

export interface StagedRef {
  name: string;
  kind: GitRefKind;
  fullName: string;
  objectName: string;
  contentDir: string;
  assetsDir: string;
  configPath: string;
}

export interface StageManifest {
  generatedAt: string;
  projectRoot: string;
  repoRoot: string;
  project: ScriptoriumProjectConfig;
  refs: StagedRef[];
}

export interface StageProjectRefsOptions {
  projectRoot?: string;
  outputDir?: string;
}

function runGit(projectRoot: string, args: string[]) {
  return execFileSync("git", args, {
    cwd: projectRoot,
    encoding: "utf8"
  }).trim();
}

function readGitFile(repoRoot: string, refName: string, filePath: string) {
  return execFileSync("git", ["show", `${refName}:${filePath}`], {
    cwd: repoRoot
  });
}

function listFilesInRef(repoRoot: string, refName: string, projectRootDir: string) {
  const prefixes = getContractPrefixes(projectRootDir, repoRoot);
  const output = execFileSync(
    "git",
    [
      "ls-tree",
      "-r",
      "--name-only",
      refName,
      "--",
      prefixes.contentPrefix.slice(0, -1),
      prefixes.assetsPrefix.slice(0, -1),
      prefixes.configPath
    ],
    {
      cwd: repoRoot,
      encoding: "utf8"
    }
  ).trim();

  if (output === "") {
    return [];
  }

  return output
    .split("\n")
    .map((entry) => normalizeRepoRelativePath(entry))
    .filter((entry) => isBundledContractPath(entry, projectRootDir, repoRoot));
}

function resolveStagedDestination(filePath: string, refRoot: string, projectRoot: string, repoRoot: string) {
  const prefixes = getContractPrefixes(projectRoot, repoRoot);

  if (filePath.startsWith(prefixes.contentPrefix)) {
    return path.join(refRoot, "content", filePath.slice(prefixes.contentPrefix.length));
  }

  if (filePath.startsWith(prefixes.assetsPrefix)) {
    return path.join(refRoot, "assets", filePath.slice(prefixes.assetsPrefix.length));
  }

  return path.join(refRoot, "scriptorium.project.json");
}

async function exportRef(projectRoot: string, repoRoot: string, ref: GitRef, outputDir: string) {
  const refRoot = path.join(outputDir, "refs", ref.name);
  const files = listFilesInRef(repoRoot, ref.fullName, projectRoot);

  if (!files.some((entry) => entry.includes("/docs/content/") || entry.startsWith("docs/content/"))) {
    throw new Error(`Ref "${ref.name}" does not contain docs/content files.`);
  }

  await mkdir(refRoot, { recursive: true });

  for (const filePath of files) {
    const destination = resolveStagedDestination(filePath, refRoot, projectRoot, repoRoot);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, readGitFile(repoRoot, ref.fullName, filePath));
  }

  return {
    name: ref.name,
    kind: ref.kind,
    fullName: ref.fullName,
    objectName: ref.objectName,
    contentDir: path.join(refRoot, "content"),
    assetsDir: path.join(refRoot, "assets"),
    configPath: path.join(refRoot, "scriptorium.project.json")
  } satisfies StagedRef;
}

async function exportWorkingTreeRef(projectRoot: string, refName: string, outputDir: string) {
  const refRoot = path.join(outputDir, "refs", refName);
  const { configPath, docsAssetsDir, docsContentDir } = resolveProjectPaths(projectRoot);

  await mkdir(refRoot, { recursive: true });
  await cp(docsContentDir, path.join(refRoot, "content"), { recursive: true });

  try {
    await cp(docsAssetsDir, path.join(refRoot, "assets"), { recursive: true });
  } catch {
    await mkdir(path.join(refRoot, "assets"), { recursive: true });
  }

  await cp(configPath, path.join(refRoot, "scriptorium.project.json"));

  return {
    name: refName,
    kind: "branch" as const,
    fullName: `working-tree/${refName}`,
    objectName: "working-tree",
    contentDir: path.join(refRoot, "content"),
    assetsDir: path.join(refRoot, "assets"),
    configPath: path.join(refRoot, "scriptorium.project.json")
  } satisfies StagedRef;
}

async function copyCurrentAssets(projectRoot: string, outputDir: string) {
  const { docsAssetsDir } = resolveProjectPaths(projectRoot);
  const currentAssetsDir = path.join(outputDir, "current", "assets");

  try {
    const assetStats = await stat(docsAssetsDir);
    if (!assetStats.isDirectory()) return currentAssetsDir;
  } catch {
    return currentAssetsDir;
  }

  await mkdir(path.dirname(currentAssetsDir), { recursive: true });
  await cp(docsAssetsDir, currentAssetsDir, { recursive: true });

  return currentAssetsDir;
}

async function stageWorkingTreeRefs(projectRoot: string, outputDir: string, project: ScriptoriumProjectConfig) {
  const { configPath, docsAssetsDir, docsContentDir } = resolveProjectPaths(projectRoot);
  const refNames = new Set<string>([
    project.defaultRef,
    ...project.refRules.extraRefs,
    ...Object.keys(project.refs)
  ]);

  const stagedRefs: StagedRef[] = [];

  for (const refName of refNames) {
    const refRoot = path.join(outputDir, "refs", refName);

    await mkdir(refRoot, { recursive: true });
    await cp(docsContentDir, path.join(refRoot, "content"), { recursive: true });

    try {
      await cp(docsAssetsDir, path.join(refRoot, "assets"), { recursive: true });
    } catch {
      await mkdir(path.join(refRoot, "assets"), { recursive: true });
    }

    await cp(configPath, path.join(refRoot, "scriptorium.project.json"));

    stagedRefs.push({
      name: refName,
      kind: "branch",
      fullName: `working-tree/${refName}`,
      objectName: "working-tree",
      contentDir: path.join(refRoot, "content"),
      assetsDir: path.join(refRoot, "assets"),
      configPath: path.join(refRoot, "scriptorium.project.json")
    });
  }

  return stagedRefs;
}

export async function readStageManifest(projectRoot = process.cwd(), outputDir = path.join(projectRoot, ".scriptorium", "staged")) {
  const manifestPath = path.join(outputDir, "manifest.json");
  const raw = await readFile(manifestPath, "utf8");

  return JSON.parse(raw) as StageManifest;
}

export async function stageProjectRefs(options: StageProjectRefsOptions = {}) {
  const projectRoot = path.resolve(options.projectRoot ?? process.cwd());
  const outputDir = path.resolve(options.outputDir ?? path.join(projectRoot, ".scriptorium", "staged"));
  const repoRoot = getRepositoryRoot(projectRoot);
  const currentBranch = getCurrentBranch(projectRoot);
  const worktreeDirty = isWorktreeDirty(projectRoot);

  await assertProjectContract(projectRoot);

  const project = await loadProjectConfig(projectRoot);
  const availableRefs = listGitRefs(projectRoot);

  await rm(outputDir, { recursive: true, force: true });
  await mkdir(path.join(outputDir, "refs"), { recursive: true });
  await copyCurrentAssets(projectRoot, outputDir);

  let stagedRefs: StagedRef[] = [];
  if (availableRefs.length === 0) {
    stagedRefs = await stageWorkingTreeRefs(projectRoot, outputDir, project);
  } else {
    const refs = filterPublishedRefs(availableRefs, project);
    for (const ref of refs) {
      if (worktreeDirty && ref.kind === "branch" && ref.name === currentBranch) {
        stagedRefs.push(await exportWorkingTreeRef(projectRoot, ref.name, outputDir));
      } else {
        stagedRefs.push(await exportRef(projectRoot, repoRoot, ref, outputDir));
      }
    }
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    projectRoot,
    repoRoot,
    project,
    refs: stagedRefs
  } satisfies StageManifest;

  await writeFile(path.join(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2));

  return manifest;
}

function getCurrentBranch(projectRoot: string) {
  try {
    return runGit(projectRoot, ["branch", "--show-current"]);
  } catch {
    return "";
  }
}

function isWorktreeDirty(projectRoot: string) {
  try {
    return runGit(projectRoot, ["status", "--porcelain"]) !== "";
  } catch {
    return false;
  }
}
