import { expect, test } from 'bun:test'
import { staticClient } from 'fumadocs-core/search/client/orama-static'
import type { AdvancedIndex } from 'fumadocs-core/search/server'
import { countSearchRecords, exportSearchIndex } from './export-search-index'

const engine: AdvancedIndex = {
  id: '/docs/dev/configuration/engine',
  url: '/docs/dev/configuration/engine',
  title: 'Engine',
  description: 'How journeys run.',
  structuredData: {
    headings: [{ id: 'journey-mode', content: 'Journey mode' }],
    contents: [
      { heading: 'journey-mode', content: '`INTERACTIVE` means the flow may prompt the player.' },
    ],
  },
}

const russianEngine: AdvancedIndex = {
  ...engine,
  id: '/ru/docs/dev/configuration/engine',
  url: '/ru/docs/dev/configuration/engine',
  title: 'Движок',
  description: 'Как проходят сценарии.',
  structuredData: {
    headings: [{ id: 'journey-mode', content: 'Режим прохождения' }],
    contents: [
      { heading: 'journey-mode', content: 'Интерактивный режим показывает игроку запросы.' },
    ],
  },
}

test('finds the body text of pages, in the browser, in any language', async () => {
  const exported = await exportSearchIndex([engine, russianEngine])
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async () => new Response(exported)) as unknown as typeof fetch

  try {
    const client = staticClient({ from: '/api/search?ref=dev' })
    const english = await client.search('INTERACTIVE')
    const russian = await client.search('запросы')

    expect(english.map((result) => result.url)).toContain(
      '/docs/dev/configuration/engine#journey-mode',
    )
    expect(russian.map((result) => result.url)).toContain(
      '/ru/docs/dev/configuration/engine#journey-mode',
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('counts a record for the page, its description, headings and text blocks', () => {
  expect(countSearchRecords(engine)).toBe(4)
})
