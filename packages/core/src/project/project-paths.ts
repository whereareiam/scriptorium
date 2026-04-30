import path from "node:path";

export function resolveProjectPaths(projectRoot: string) {
  return {
    projectRoot,
    docsContentDir: path.join(projectRoot, "docs", "content"),
    docsAssetsDir: path.join(projectRoot, "docs", "assets"),
    configPath: path.join(projectRoot, "scriptorium.project.json")
  };
}

export function normalizeRepoRelativePath(input: string) {
  return input.split(path.sep).join("/");
}

export function getContractPrefixes(projectRoot: string, repoRoot: string) {
  const relativeProjectRoot = path.relative(repoRoot, projectRoot);
  const prefix = relativeProjectRoot === "" ? "" : `${normalizeRepoRelativePath(relativeProjectRoot)}/`;

  return {
    contentPrefix: `${prefix}docs/content/`,
    assetsPrefix: `${prefix}docs/assets/`,
    configPath: `${prefix}scriptorium.project.json`
  };
}

export function isBundledContractPath(relativePath: string, projectRoot = ".", repoRoot = ".") {
  const normalized = normalizeRepoRelativePath(relativePath);
  const prefixes = getContractPrefixes(projectRoot, repoRoot);

  return (
    normalized.startsWith(prefixes.contentPrefix) ||
    normalized.startsWith(prefixes.assetsPrefix) ||
    normalized === prefixes.configPath
  );
}
