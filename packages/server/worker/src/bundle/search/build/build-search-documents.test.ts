import { expect, test } from 'bun:test'
import { buildSearchDocuments } from './build-search-documents'

test('indexes the headings and body text of a page, not only its title', () => {
  const documents = buildSearchDocuments({
    id: '/docs/dev/engine',
    title: 'Engine',
    description: 'How journeys run.',
    url: '/docs/dev/engine',
    breadcrumbs: ['Configuration'],
    structuredData: {
      headings: [{ id: 'journey-mode', content: 'Journey mode' }],
      contents: [
        { heading: 'journey-mode', content: '`INTERACTIVE` means the flow may prompt the player.' },
        { heading: undefined, content: 'Intro text.' },
      ],
    },
  } as Parameters<typeof buildSearchDocuments>[0])

  expect(documents.map(({ type, content, url }) => ({ type, content, url }))).toEqual([
    { type: 'page', content: 'Engine', url: '/docs/dev/engine' },
    { type: 'text', content: 'How journeys run.', url: '/docs/dev/engine' },
    { type: 'heading', content: 'Journey mode', url: '/docs/dev/engine#journey-mode' },
    {
      type: 'text',
      content: '`INTERACTIVE` means the flow may prompt the player.',
      url: '/docs/dev/engine#journey-mode',
    },
    { type: 'text', content: 'Intro text.', url: '/docs/dev/engine' },
  ])
  expect(documents.every((document) => typeof document.content === 'string')).toBe(true)
})
