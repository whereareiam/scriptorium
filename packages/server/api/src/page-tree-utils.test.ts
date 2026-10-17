import { describe, expect, test } from 'bun:test'
import type { ServedPageTreeNode } from './models/served/page/served-page-tree'
import { findStartPageUrl } from './page-tree-utils'

const page = (url: string): ServedPageTreeNode => ({ type: 'page', name: url, url })

describe('findStartPageUrl', () => {
  test('opens the first page of the first section', () => {
    expect(
      findStartPageUrl({
        name: 'Docs',
        children: [
          { type: 'separator', name: 'Readers' },
          {
            type: 'folder',
            name: 'Guides',
            children: [page('/docs/dev/guides/install')],
          },
          {
            type: 'folder',
            name: 'Server admins',
            root: true,
            children: [
              {
                type: 'folder',
                name: 'Overview',
                index: { type: 'page', name: 'Overview', url: '/docs/dev/admins' },
                children: [],
              },
              page('/docs/dev/admins/install'),
            ],
          },
          { type: 'folder', name: 'Developers', root: true, children: [page('/docs/dev/api')] },
        ],
      }),
    ).toBe('/docs/dev/admins')
  })

  test('opens the first page when the version has no sections', () => {
    expect(
      findStartPageUrl({
        name: 'Docs',
        children: [
          { type: 'page', name: 'GitHub', url: 'https://github.com', external: true },
          { type: 'folder', name: 'Guides', children: [page('/ru/docs/dev/guides/install')] },
        ],
      }),
    ).toBe('/ru/docs/dev/guides/install')
  })

  test('finds nothing in an empty version', () => {
    expect(findStartPageUrl({ name: 'Docs', children: [] })).toBeUndefined()
  })
})
