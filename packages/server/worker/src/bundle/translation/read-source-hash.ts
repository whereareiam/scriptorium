const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/
const SOURCE_HASH_PATTERN = /^sourceHash:[ \t]*["']?([0-9a-f]{40})["']?[ \t]*$/m

/** The `sourceHash` a translation records in its frontmatter, read the way `i18n-check.sh` reads it. */
export function readSourceHash(content: string) {
  const frontmatter = FRONTMATTER_PATTERN.exec(content)?.[1]
  if (!frontmatter) {
    return undefined
  }

  return SOURCE_HASH_PATTERN.exec(frontmatter)?.[1]
}
