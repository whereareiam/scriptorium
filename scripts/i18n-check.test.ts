import { afterEach, describe, expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { chmod, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const SCRIPT = path.join(import.meta.dir, 'i18n-check.sh')
const roots: string[] = []

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })))
})

describe('i18n-check.sh', () => {
  test('passes for stamped translations and ignores untranslated pages', async () => {
    const root = await createProject()
    await write(root, 'docs/i18n/ru/setup.mdx', '---\ntitle: Установка\n---\n\nУстановите.\n')
    expect(run(root, 'stamp', 'docs/i18n/ru/setup.mdx').status).toBe(0)

    const result = run(root)
    expect(result.stdout).toBe('')
    expect(result.status).toBe(0)
    expect(await readFile(path.join(root, 'docs/i18n/ru/setup.mdx'), 'utf8')).toMatch(
      /^---\ntitle: Установка\nsourceHash: [0-9a-f]{40}\n---\n/,
    )
  })

  test('reports an outdated translation with the change to the original', async () => {
    const root = await createProject()
    await write(root, 'docs/i18n/ru/setup.mdx', '---\ntitle: Установка\n---\n\nУстановите.\n')
    run(root, 'stamp', 'docs/i18n/ru/setup.mdx')
    await write(
      root,
      'docs/content/setup.mdx',
      '---\ntitle: Setup\n---\n\nInstall it on the proxy.\n',
    )

    const result = run(root)
    expect(result.status).toBe(1)
    expect(result.stdout).toContain('outdated: docs/i18n/ru/setup.mdx')
    expect(result.stdout).toContain('-Install it.')
    expect(result.stdout).toContain('+Install it on the proxy.')
    expect(result.stdout).toContain('docs/i18n/check.sh stamp docs/i18n/ru/setup.mdx')
  })

  test('reports unstamped and orphaned translations', async () => {
    const root = await createProject()
    await write(root, 'docs/i18n/ru/setup.mdx', 'Установите.\n')
    await write(
      root,
      'docs/i18n/ru/removed.mdx',
      '---\nsourceHash: 0000000000000000000000000000000000000000\n---\n',
    )

    const result = run(root)
    expect(result.status).toBe(1)
    expect(result.stdout).toContain('unstamped: docs/i18n/ru/setup.mdx')
    expect(result.stdout).toContain('orphaned: docs/i18n/ru/removed.mdx')
  })

  test('adds frontmatter when stamping a page without it', async () => {
    const root = await createProject()
    await write(root, 'docs/i18n/ru/setup.mdx', 'Установите.\n')
    run(root, 'stamp', 'docs/i18n/ru/setup.mdx')

    expect(await readFile(path.join(root, 'docs/i18n/ru/setup.mdx'), 'utf8')).toMatch(
      /^---\nsourceHash: [0-9a-f]{40}\n---\n\nУстановите.\n$/,
    )
  })

  test('checks in staged mode only what the commit touches, as staged', async () => {
    const root = await createProject()
    await write(root, 'docs/content/faq.mdx', '---\ntitle: FAQ\n---\n\nQuestions.\n')
    await write(root, 'docs/i18n/ru/setup.mdx', 'Установите.\n')
    await write(root, 'docs/i18n/ru/faq.mdx', 'Вопросы.\n')
    run(root, 'stamp', 'docs/i18n/ru/setup.mdx', 'docs/i18n/ru/faq.mdx')
    git(root, 'add', '-A')
    git(root, 'commit', '-qm', 'docs')

    await write(root, 'docs/content/setup.mdx', '---\ntitle: Setup\n---\n\nChanged.\n')
    expect(run(root, '--staged').status).toBe(0)

    git(root, 'add', 'docs/content/setup.mdx')
    const result = run(root, '--staged')
    expect(result.status).toBe(1)
    expect(result.stdout).toContain('outdated: docs/i18n/ru/setup.mdx')
    expect(result.stdout).not.toContain('faq.mdx')
  })

  test('counts pages per language', async () => {
    const root = await createProject()
    await write(root, 'docs/content/faq.mdx', 'FAQ\n')
    await write(root, 'docs/i18n/ru/setup.mdx', 'Установите.\n')
    run(root, 'stamp', 'docs/i18n/ru/setup.mdx')

    expect(run(root, 'status').stdout).toBe(
      'ru: 1 up to date, 0 need attention, 1 untranslated (of 2)\n',
    )
  })
})

async function createProject() {
  const root = await mkdtemp(path.join(os.tmpdir(), 'scriptorium-i18n-check-'))
  roots.push(root)
  git(root, 'init', '-q')
  git(root, 'config', 'user.email', 'test@example.com')
  git(root, 'config', 'user.name', 'Test')
  git(root, 'config', 'commit.gpgsign', 'false')
  await write(root, 'docs/content/setup.mdx', '---\ntitle: Setup\n---\n\nInstall it.\n')
  await mkdir(path.join(root, 'docs/i18n'), { recursive: true })
  await copyFile(SCRIPT, path.join(root, 'docs/i18n/check.sh'))
  await chmod(path.join(root, 'docs/i18n/check.sh'), 0o755)
  return root
}

function run(root: string, ...args: string[]) {
  const result = spawnSync('sh', [path.join(root, 'docs/i18n/check.sh'), ...args], {
    cwd: root,
    encoding: 'utf8',
  })
  return { status: result.status, stdout: result.stdout, stderr: result.stderr }
}

function git(root: string, ...args: string[]) {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' })
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`)
  }
}

async function write(root: string, relativePath: string, content: string) {
  const filePath = path.join(root, relativePath)
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, content)
}
