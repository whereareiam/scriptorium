import { afterEach, describe, expect, test } from 'bun:test'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { evaluateProjectComponents } from '@scriptorium/server-api'
import { bundleProjectComponents } from './bundle-project-components'

const directories: string[] = []

afterEach(async () => {
  await Promise.all(directories.splice(0).map((dir) => rm(dir, { recursive: true, force: true })))
})

describe('bundleProjectComponents', () => {
  test('registers top-level component files by name and keeps host modules external', async () => {
    const componentsDir = await createComponents({
      'Greeting.tsx': `import { Callout } from 'fumadocs-ui/components/callout'
import { shout } from './lib/shout'
export default function Greeting({ name }: { name: string }) {
  return <Callout>{shout(name)}</Callout>
}`,
      'Farewell.jsx': `export function Farewell() { return <p>Bye</p> }`,
      'lib/shout.ts': `export const shout = (value: string) => value.toUpperCase()`,
      'notes.md': 'Not a component.',
    })

    const code = await bundleProjectComponents(componentsDir)
    const required: string[] = []
    const components = evaluateProjectComponents(code!, (specifier) => {
      required.push(specifier)
      if (specifier === 'react/jsx-runtime') {
        return { jsx: (type: unknown, props: unknown) => ({ type, props }), Fragment: 'fragment' }
      }

      return { Callout: 'callout' }
    })

    expect(components.map((component) => [component.name, component.file])).toEqual([
      ['Farewell', 'Farewell.jsx'],
      ['Greeting', 'Greeting.tsx'],
    ])
    expect(required).toContain('fumadocs-ui/components/callout')
    const greeting = components[1].component as (props: { name: string }) => any
    expect(greeting({ name: 'alex' })).toEqual({ type: 'callout', props: { children: 'ALEX' } })
  })

  test('returns null without component files', async () => {
    const componentsDir = await createComponents({ 'lib/helper.ts': 'export const value = 1' })

    expect(await bundleProjectComponents(componentsDir)).toBeNull()
  })

  test('fails on Node built-ins and names the file', async () => {
    const componentsDir = await createComponents({
      'Reader.tsx': `import { readFileSync } from 'node:fs'
export default function Reader() { return <pre>{readFileSync('/etc/hostname', 'utf8')}</pre> }`,
    })

    const error = await bundleProjectComponents(componentsDir).catch((error: Error) => error)
    expect(String(error)).toContain('docs/components/Reader.tsx:1')
    expect(String(error)).toContain('"node:fs" is a Node built-in')
  })

  test('fails on packages Scriptorium does not provide', async () => {
    const componentsDir = await createComponents({
      'Chart.tsx': `import Chart from 'chart.js'
export default function Graph() { return <Chart /> }`,
    })

    const error = await bundleProjectComponents(componentsDir).catch((error: Error) => error)
    expect(String(error)).toContain('docs/components/Chart.tsx:1')
    expect(String(error)).toContain('"chart.js" is not provided by Scriptorium')
  })

  test('fails on imports outside docs/components', async () => {
    const componentsDir = await createComponents({
      'Leak.tsx': `import secret from '../secret'
export default function Leak() { return <p>{secret}</p> }`,
    })

    const error = await bundleProjectComponents(componentsDir).catch((error: Error) => error)
    expect(String(error)).toContain('"../secret" is outside docs/components')
  })

  test('fails when a file has no usable export', async () => {
    const componentsDir = await createComponents({
      'Empty.tsx': `export const value = 1`,
    })

    const error = await bundleProjectComponents(componentsDir).catch((error: Error) => error)
    expect(String(error)).toContain(
      'docs/components/Empty.tsx must export a component named Empty or a default export',
    )
  })

  test('refuses to shadow a built-in component unless it overrides on purpose', async () => {
    const shadowing = await createComponents({
      'Callout.tsx': `export default function Callout() { return <div /> }`,
    })
    const error = await bundleProjectComponents(shadowing, ['Callout']).catch(
      (error: Error) => error,
    )
    expect(String(error)).toContain('docs/components/Callout.tsx is named like the built-in')

    const overriding = await createComponents({
      'Callout.tsx': `export const override = true
export default function Callout() { return <div /> }`,
    })
    const code = await bundleProjectComponents(overriding, ['Callout'])
    const [component] = evaluateProjectComponents(code!, () => ({ jsx: () => null }))
    expect(component.override).toBe(true)
  })
})

async function createComponents(files: Record<string, string>) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'scriptorium-components-'))
  directories.push(root)
  for (const [file, content] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(root, file)), { recursive: true })
    await writeFile(path.join(root, file), content)
  }

  return root
}
