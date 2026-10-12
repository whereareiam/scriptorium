import path from 'node:path'

export function resolveProjectPaths(projectRoot: string) {
  return {
    projectRoot,
    docsContentDir: path.join(projectRoot, 'docs', 'content'),
    docsAssetsDir: path.join(projectRoot, 'docs', 'assets'),
    docsI18nDir: path.join(projectRoot, 'docs', 'i18n'),
    configPath: path.join(projectRoot, 'scriptorium.project.json'),
  }
}

export function normalizeRepoRelativePath(input: string) {
  return input.split(path.sep).join('/')
}

export function getContractPrefixes(projectRoot: string, repoRoot: string) {
  const relativeProjectRoot = path.relative(repoRoot, projectRoot)
  const prefix =
    relativeProjectRoot === '' ? '' : `${normalizeRepoRelativePath(relativeProjectRoot)}/`

  return {
    contentPrefix: `${prefix}docs/content/`,
    assetsPrefix: `${prefix}docs/assets/`,
    i18nPrefix: `${prefix}docs/i18n/`,
    configPath: `${prefix}scriptorium.project.json`,
  }
}

export function isBundledContractPath(relativePath: string, projectRoot = '.', repoRoot = '.') {
  const normalized = normalizeRepoRelativePath(relativePath)
  const prefixes = getContractPrefixes(projectRoot, repoRoot)

  return (
    normalized.startsWith(prefixes.contentPrefix) ||
    normalized.startsWith(prefixes.assetsPrefix) ||
    normalized.startsWith(prefixes.i18nPrefix) ||
    normalized === prefixes.configPath
  )
}

export function filterBundledContractPaths(files: string[], projectRoot: string, repoRoot: string) {
  return files
    .map((entry) => normalizeRepoRelativePath(entry))
    .filter((entry) => isBundledContractPath(entry, projectRoot, repoRoot))
}
