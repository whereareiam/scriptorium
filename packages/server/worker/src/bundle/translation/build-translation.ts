import { cp, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import type { ServedPageTranslationState } from '@scriptorium/server-api'
import { gitBlobHash } from './git-blob-hash'
import { mergeTranslatedMeta } from './merge-translated-meta'
import { readSourceHash } from './read-source-hash'

const PARTIALS_DIR_NAME = '_partials'
const META_FILE_NAME = 'meta.json'

export interface BuiltTranslation {
  language: string
  /** The default-language content with the translation laid over it, includes not yet expanded. */
  contentDir: string
  /** The state of every translatable file, keyed by its path relative to the content root. */
  states: Map<string, ServedPageTranslationState>
  /** Translation files whose default-language file no longer exists; they are left out. */
  orphans: string[]
}

/**
 * Builds the content of one translated language: every page of the default language,
 * replaced by its translation where one exists. A translation counts as outdated when the
 * `sourceHash` in its frontmatter is not the git blob hash of the current default-language file.
 *
 * Call it before includes are expanded, so hashes are taken from the files authors edit.
 */
export async function buildTranslation(options: {
  language: string
  defaultContentDir: string
  translationDir: string
  outputDir: string
}): Promise<BuiltTranslation> {
  const { language, defaultContentDir, translationDir, outputDir } = options
  await cp(defaultContentDir, outputDir, { recursive: true })

  const states = new Map<string, ServedPageTranslationState>()
  for (const relativePath of await listFiles(defaultContentDir)) {
    if (isMarkdown(relativePath)) {
      states.set(relativePath, 'untranslated')
    }
  }

  const orphans: string[] = []
  for (const relativePath of await listFiles(translationDir)) {
    const defaultPath = path.join(defaultContentDir, relativePath)
    const translatedPath = path.join(translationDir, relativePath)
    const outputPath = path.join(outputDir, relativePath)

    if (path.basename(relativePath) === META_FILE_NAME) {
      const defaultMeta = await readJsonIfPresent(defaultPath)
      if (!defaultMeta) {
        orphans.push(relativePath)
        continue
      }

      const merged = mergeTranslatedMeta(
        defaultMeta,
        JSON.parse(await readFile(translatedPath, 'utf8')),
      )
      await writeFile(outputPath, `${JSON.stringify(merged, null, 2)}\n`)
      continue
    }

    if (!isMarkdown(relativePath)) {
      continue
    }

    if (!states.has(relativePath)) {
      orphans.push(relativePath)
      continue
    }

    const translated = await readFile(translatedPath, 'utf8')
    const sourceHash = readSourceHash(translated)
    const currentHash = gitBlobHash(await readFile(defaultPath))
    states.set(relativePath, sourceHash === currentHash ? 'translated' : 'outdated')
    await mkdir(path.dirname(outputPath), { recursive: true })
    await writeFile(outputPath, translated)
  }

  return {
    language,
    contentDir: outputDir,
    states,
    orphans,
  }
}

/**
 * The state shown for a page: an outdated partial makes the page outdated too, because
 * its text is part of the page. Partials without a translation don't count, since a
 * partial holding only code or configuration is meant to stay in the default language.
 */
export function resolvePageState(
  translation: BuiltTranslation,
  pagePath: string,
  includedPartials: Map<string, string[]>,
): ServedPageTranslationState {
  const pageState = translation.states.get(pagePath) ?? 'untranslated'
  if (pageState === 'untranslated') {
    return pageState
  }

  const partialOutdated = (includedPartials.get(pagePath) ?? []).some(
    (partialPath) => translation.states.get(partialPath) === 'outdated',
  )
  return partialOutdated ? 'outdated' : pageState
}

export function isPartialPath(relativePath: string) {
  return relativePath.split('/').includes(PARTIALS_DIR_NAME)
}

function isMarkdown(relativePath: string) {
  return /\.(md|mdx)$/i.test(relativePath)
}

async function readJsonIfPresent(filePath: string) {
  try {
    return JSON.parse(await readFile(filePath, 'utf8')) as Record<string, unknown>
  } catch {
    return undefined
  }
}

async function listFiles(rootDir: string, prefix = ''): Promise<string[]> {
  if (!(await isDirectory(rootDir))) {
    return []
  }

  const files: string[] = []
  const entries = await readdir(rootDir, { withFileTypes: true })
  entries.sort((left, right) => left.name.localeCompare(right.name))
  for (const entry of entries) {
    const relativePath = `${prefix}${entry.name}`
    if (entry.isDirectory()) {
      files.push(...(await listFiles(path.join(rootDir, entry.name), `${relativePath}/`)))
      continue
    }

    files.push(relativePath)
  }

  return files
}

async function isDirectory(dirPath: string) {
  try {
    return (await stat(dirPath)).isDirectory()
  } catch {
    return false
  }
}
