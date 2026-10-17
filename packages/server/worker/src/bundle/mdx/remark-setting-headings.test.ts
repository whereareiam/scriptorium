import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import type { LocalMarkdownPage } from '@fumadocs/local-md'
import type { StagedBundle } from '../build-project-bundle'
import { loadSearchSource } from '../search/load-search-source'

const directories: string[] = []

afterEach(async () => {
  await Promise.all(directories.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

describe('remarkSettingHeadings', () => {
  test('gives each setting a heading in the table of contents and in search', async () => {
    const { code, structuredData } = await compilePage(`# Reference

## Server

<Setting name="server.port" takes="1-65535" default="8080">
  The port to listen on.
</Setting>

<Setting
  name="server.host"
  id="host"
  depth={4}
  flag="advanced"
/>
`)

    expect(code).toContain('url: "#serverport"')
    expect(code).toContain('url: "#host"')
    expect(code).toContain('depth: 4')
    expect(code).toContain('headed: true')
    expect(structuredData.headings).toEqual([
      { id: 'reference', content: 'Reference' },
      { id: 'server', content: 'Server' },
      { id: 'serverport', content: 'server.port' },
      { id: 'host', content: 'server.host' },
    ])
    expect(structuredData.contents).toContainEqual({
      heading: 'serverport',
      content: 'The port to listen on.',
    })
  })

  test('leaves settings with a computed name to the component', async () => {
    const { code } = await compilePage(`<Setting name={'computed'.toUpperCase()} />\n`)

    expect(code).not.toContain('headed')
  })
})

async function compilePage(content: string) {
  const contentDir = await mkdtemp(path.join(os.tmpdir(), 'scriptorium-setting-'))
  directories.push(contentDir)
  await writeFile(path.join(contentDir, 'index.mdx'), `---\ntitle: Reference\n---\n\n${content}`)

  const bundle = {
    project: { name: 'Test', versions: { home: 'dev', include: [], meta: {} } },
    versions: [{ name: 'dev', slug: 'dev', kind: 'branch', contentDir, translations: [] }],
  } as unknown as StagedBundle
  const source = await loadSearchSource(bundle, 'dev')
  const [page] = source.getPages()
  const renderer = await (page.data as unknown as LocalMarkdownPage).load()
  const serialized = renderer.serialize() as {
    code: string
    structuredData: {
      headings: Array<{ id: string; content: string }>
      contents: Array<{ heading?: string; content: string }>
    }
  }
  return serialized
}
